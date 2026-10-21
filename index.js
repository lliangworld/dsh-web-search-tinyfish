import { credentialRef, isCredentialRefName } from "@deepseek-ai/dsh-credentials";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import z from "@deepseek-ai/schemastery";
import { WebError } from "@deepseek-ai/dsh-web";
/**
 * `TinyFishSearchProvider`: a `WebSearchProvider` backed by the TinyFish search
 * API (`GET https://api.search.tinyfish.ai`). TinyFish has no result-count
 * parameter — one page is server-sized — so `maxResults` passes through to the
 * seam, which truncates on the way back. Results map straight to
 * `WebSearchSource`; entries without a non-blank `snippet` are dropped and
 * `content` is omitted because TinyFish returns no generated answer.
 * @module @lliangworld/dsh-web-search-tinyfish/provider
 */
/** Stable id both providers register under (unique per capability kind). */
const TINYFISH_PROVIDER_ID = "tinyfish";
/** Default TinyFish search endpoint base; every request is a `GET` against it. */
const TINYFISH_DEFAULT_SEARCH_BASE_URL = "https://api.search.tinyfish.ai";
/** Default TinyFish fetch endpoint base; every request is a `POST` against it. */
const TINYFISH_DEFAULT_FETCH_BASE_URL = "https://api.fetch.tinyfish.ai";
/** Default output format for fetched pages; TinyFish recommends markdown for LLMs. */
const TINYFISH_DEFAULT_FORMAT = "markdown";
/** Default total-character cap applied to a fetched page before returning it. */
const TINYFISH_DEFAULT_MAX_CHARS = 50000;
/**
 * Default cache-freshness preference (`ttl`) in seconds. `0` forces a live
 * fetch; this provider replaces the local HTTP fetcher, which always reads the
 * live source, so it defaults to `0`.
 */
const TINYFISH_DEFAULT_TTL = 0;
/** Default per-URL wall-clock budget forwarded as `per_url_timeout_ms`. */
const TINYFISH_DEFAULT_PER_URL_TIMEOUT_MS = 60000;
/** TinyFish's accepted `per_url_timeout_ms` upper bound (the backend cap). */
const TINYFISH_MAX_PER_URL_TIMEOUT_MS = 110000;
/** TinyFish's accepted `recency_minutes` bounds (1 minute .. 10 years). */
const TINYFISH_MIN_RECENCY_MINUTES = 1;
const TINYFISH_MAX_RECENCY_MINUTES = 5256000;
/** TinyFish's accepted `page` upper bound (zero-based pagination). */
const TINYFISH_MAX_PAGE = 10;
/** Attribution header sent on every request. */
const USER_AGENT = "dsh-web-search-tinyfish/1.0.8";
/** Launch-environment variable naming the TinyFish API key credential. */
const TINYFISH_API_KEY_ENV = "TINYFISH_API_KEY";
/**
 * Return the first non-blank string among `values`, or `undefined`.
 *
 * TinyFish's publication date field is named differently across result kinds
 * (news and web results carry a date, academic ones use year fields), so the
 * mapping treats every known spelling as a candidate and blank text as absent.
 */
function firstNonBlank(...values) {
	for (const value of values) {
		if (value != null && value.trim().length > 0) return value;
	}
	return void 0;
}
/**
 * Map one TinyFish search result to a normalized source, or `undefined` when it
 * carries no portable snippet (an entry with no non-blank `snippet` is dropped —
 * the seam has no other field to derive a snippet from, and inventing one would
 * lie).
 *
 * @param result - one entry of TinyFish's `results[]`.
 * @returns the normalized source, or `undefined` when the entry has no
 *   non-blank `snippet`.
 */
function mapTinyFishResult(result) {
	const snippet = firstNonBlank(result.snippet);
	if (snippet === void 0) return void 0;
	return {
		url: result.url,
		...result.title != null && result.title.length > 0 ? { title: result.title } : {},
		snippet,
		...firstNonBlank(result.published_date, result.published_at, result.date, result.publishedDate) !== void 0 ? { publishedAt: firstNonBlank(result.published_date, result.published_at, result.date, result.publishedDate) } : {}
	};
}
/**
 * Map a TinyFish search response envelope to a normalized search result.
 *
 * TinyFish answers with no `content`, so the result omits it; the seam truncates
 * `sources[]` to the request's `maxResults` and owns the `truncated` flag,
 * because TinyFish's API has no result-count parameter to apply at the request
 * layer.
 *
 * @param response - the parsed `GET https://api.search.tinyfish.ai` body.
 * @returns the normalized result; snippet-less entries are dropped
 *   ({@link mapTinyFishResult}).
 */
function mapTinyFishResponse(response) {
	const results = Array.isArray(response?.results) ? response.results : [];
	return {
		sources: results.map(mapTinyFishResult).filter((source) => source !== void 0),
		truncated: false
	};
}
/**
 * Map a TinyFish fetch response envelope to a normalized fetch result, or
 * `undefined` when it carries no usable text.
 *
 * TinyFish renders the page in a real browser and returns cleaned content in
 * the requested `format`: `markdown`/`json` decode to `text`, `html` to `html`.
 * The envelope carries no target-page status code, so a successful call maps to
 * `200` — an unreachable, blocked, or unextractable page surfaces in
 * `errors[]` instead ({@link findTinyFishFetchError}). TinyFish applies no
 * character cap of its own, so the provider slices `text` to `maxChars` — the
 * same discipline the local HTTP fetcher applies — and flags `truncated` only
 * when it actually cut.
 *
 * @param response - the parsed `POST https://api.fetch.tinyfish.ai` body.
 * @param requestUrl - the URL the request asked for, used when the envelope
 *   carries none.
 * @param maxChars - the total-character cap applied before returning.
 * @param format - the `format` the request sent, which decides the body kind.
 * @returns the normalized fetch result, or `undefined` when the matching result
 *   entry has no `text`.
 */
function mapTinyFishFetch(response, requestUrl, maxChars, format) {
	const results = Array.isArray(response?.results) ? response.results : [];
	const entry = results.find((result) => result?.url === requestUrl) ?? results[0];
	const text = entry?.text;
	if (text == null) return void 0;
	const raw = typeof text === "string" ? text : JSON.stringify(text);
	const truncated = raw.length > maxChars;
	return {
		url: entry?.final_url != null && entry.final_url.length > 0 ? entry.final_url : entry?.url != null && entry.url.length > 0 ? entry.url : requestUrl,
		statusCode: 200,
		body: {
			kind: format === "html" ? "html" : "text",
			content: truncated ? raw.slice(0, maxChars) : raw
		},
		truncated
	};
}
/**
 * Find the per-URL failure entry for this request, if any.
 *
 * TinyFish reports per-URL failures (timeouts, bot blocks, 404s) in `errors[]`
 * alongside an HTTP 200, so a transport-level success does not mean the page
 * was fetched. One URL is sent per request, so the entry matching the requested
 * URL is preferred, with a lone entry as the fallback.
 *
 * @param response - the parsed `POST https://api.fetch.tinyfish.ai` body.
 * @param requestUrl - the URL the request asked for.
 * @returns the matching `errors[]` entry, or `undefined` when the page fetched.
 */
function findTinyFishFetchError(response, requestUrl) {
	const errors = Array.isArray(response?.errors) ? response.errors : [];
	if (errors.length === 0) return void 0;
	return errors.find((error) => error?.url === requestUrl) ?? errors[0];
}
/**
 * Describe one per-URL failure entry as a `WebError`.
 *
 * `invalid_url`/`invalid_redirect_url` are request-shape rejections (private
 * IPs, bad schemes) and map to `WEB_INVALID_URL`; every other code —
 * `target_http_error`, `page_not_found`, `timeout`, `bot_blocked`, … — is a
 * provider failure.
 */
function fetchErrorFromEntry(entry) {
	const code = typeof entry?.error === "string" && entry.error.length > 0 ? entry.error : "unknown_error";
	const status = typeof entry?.status === "number" ? entry.status : void 0;
	const message = `TinyFish fetch failed for ${entry?.url ?? "the requested URL"} (${code}${status !== void 0 ? `, HTTP ${status}` : ""})`;
	if (code === "invalid_url" || code === "invalid_redirect_url") {
		return new WebError(message, "WEB_INVALID_URL");
	}
	return new WebError(message, "WEB_PROVIDER_ERROR");
}
/**
 * Describe a non-2xx TinyFish response as one message, best effort.
 *
 * The body is read once as text so both the JSON error envelope and a
 * plain-text failure stay readable; an aborted read surfaces as `WEB_ABORTED`
 * like every other cancellation in this package.
 */
async function describeTinyFishError(response) {
	const fallback = `TinyFish API error (HTTP ${response.status})`;
	let text;
	try {
		text = await response.text();
	} catch (error) {
		if (isAbortError(error)) throw new WebError("TinyFish request aborted", "WEB_ABORTED", { cause: error });
		return fallback;
	}
	const trimmed = text.trim();
	if (trimmed.length === 0) return fallback;
	try {
		const parsed = JSON.parse(trimmed);
		const detail = parsed?.error?.message ?? parsed?.error ?? parsed?.message ?? parsed?.detail;
		if (typeof detail === "string" && detail.length > 0) return detail;
	} catch {
	}
	return trimmed;
}
/**
 * Parse and policy-check one fetch request URL before any network call.
 *
 * Only http(s) URLs reach TinyFish; anything else is a request-shape error,
 * not a provider failure.
 */
function parseFetchUrl(input) {
	if (!URL.canParse(input)) throw new WebError(`invalid URL: ${input}`, "WEB_INVALID_URL");
	const url = new URL(input);
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new WebError(`unsupported URL scheme "${url.protocol}" (only http and https are allowed)`, "WEB_INVALID_URL");
	}
	return url;
}
/** The TinyFish-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
var TinyFishSearchProvider = class {
	resolveOptions;
	id = "tinyfish";
	/**
	 * @param resolveOptions - a thunk snapshotted once at each operation's
	 *   entry, so one search never mixes two config sections and a settings
	 *   change reaches the next call without re-registering the provider —
	 *   a re-registration would make the seam's selection observable to the
	 *   user as a flicker.
	 */
	constructor(resolveOptions) {
		this.resolveOptions = resolveOptions;
	}
	available() {
		const options = this.resolveOptions();
		return this.hasCredentials(options) && isValidBaseUrl(options.searchBaseURL);
	}
	async search(request, signal) {
		const options = this.resolveOptions();
		const apiKey = await requireTinyFishApiKey(options, "search");
		const url = new URL(options.searchBaseURL);
		url.searchParams.set("query", request.query);
		if (options.purpose !== void 0) url.searchParams.set("purpose", options.purpose);
		if (options.location !== void 0) url.searchParams.set("location", options.location);
		if (options.language !== void 0) url.searchParams.set("language", options.language);
		if (options.includeDomains !== void 0) url.searchParams.set("include_domains", options.includeDomains);
		if (options.excludeDomains !== void 0) url.searchParams.set("exclude_domains", options.excludeDomains);
		if (options.domainType !== void 0) url.searchParams.set("domain_type", options.domainType);
		if (options.recencyMinutes !== void 0) url.searchParams.set("recency_minutes", String(options.recencyMinutes));
		if (options.afterDate !== void 0) url.searchParams.set("after_date", options.afterDate);
		if (options.beforeDate !== void 0) url.searchParams.set("before_date", options.beforeDate);
		if (options.pubYearMin !== void 0) url.searchParams.set("pub_year_min", String(options.pubYearMin));
		if (options.pubYearMax !== void 0) url.searchParams.set("pub_year_max", String(options.pubYearMax));
		if (options.page !== void 0) url.searchParams.set("page", String(options.page));
		let response;
		try {
			response = await fetch(url, {
				method: "GET",
				redirect: "error",
				headers: this.headers(apiKey),
				...signal !== void 0 ? { signal } : {}
			});
		} catch (error) {
			if (isAbortError(error)) throw new WebError("TinyFish search aborted", "WEB_ABORTED", { cause: error });
			throw new WebError(`TinyFish search request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
		if (!response.ok) {
			throw new WebError(await describeTinyFishError(response), "WEB_PROVIDER_ERROR");
		}
		try {
			return mapTinyFishResponse(await response.json());
		} catch (error) {
			if (isAbortError(error)) throw new WebError("TinyFish search aborted", "WEB_ABORTED", { cause: error });
			throw new WebError(`TinyFish returned an unprocessable response body: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
	}
	/** True when an API key is configured; TinyFish has no keyless endpoint. */
	hasCredentials(options) {
		return options.apiKeyState.value.length > 0;
	}
	/** Request headers; every TinyFish call carries the API key. */
	headers(apiKey) {
		return {
			"x-api-key": apiKey,
			accept: "application/json",
			"user-agent": USER_AGENT
		};
	}
};
/** The TinyFish-backed fetch provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
var TinyFishFetchProvider = class {
	resolveOptions;
	id = "tinyfish";
	/**
	 * @param resolveOptions - a thunk snapshotted once at each operation's
	 *   entry; see {@link TinyFishSearchProvider}.
	 */
	constructor(resolveOptions) {
		this.resolveOptions = resolveOptions;
	}
	available() {
		const options = this.resolveOptions();
		return this.hasCredentials(options) && isValidBaseUrl(options.fetchBaseURL) && isSupportedFormat(options.format) && isPositiveInteger(options.maxChars) && isNonNegativeInteger(options.ttl) && (options.perUrlTimeoutMs === void 0 || isPositiveInteger(options.perUrlTimeoutMs) && options.perUrlTimeoutMs <= 110000);
	}
	async fetch(request, signal) {
		const options = this.resolveOptions();
		const target = parseFetchUrl(request.url);
		const requestUrl = target.toString();
		const apiKey = await requireTinyFishApiKey(options, "fetch");
		let response;
		try {
			response = await fetch(options.fetchBaseURL, {
				method: "POST",
				redirect: "error",
				headers: this.headers(apiKey),
				body: JSON.stringify({
					urls: [requestUrl],
					format: options.format,
					ttl: options.ttl,
					per_url_timeout_ms: options.perUrlTimeoutMs
				}),
				...signal !== void 0 ? { signal } : {}
			});
		} catch (error) {
			if (isAbortError(error)) throw new WebError("TinyFish fetch aborted", "WEB_ABORTED", { cause: error });
			throw new WebError(`TinyFish fetch request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
		if (!response.ok) {
			throw new WebError(await describeTinyFishError(response), "WEB_PROVIDER_ERROR");
		}
		let payload;
		try {
			payload = await response.json();
		} catch (error) {
			if (isAbortError(error)) throw new WebError("TinyFish fetch aborted", "WEB_ABORTED", { cause: error });
			throw new WebError(`TinyFish returned an unprocessable response body: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
		const failure = findTinyFishFetchError(payload, requestUrl);
		if (failure !== void 0) throw fetchErrorFromEntry(failure);
		const result = mapTinyFishFetch(payload, requestUrl, options.maxChars, options.format);
		if (result === void 0) throw new WebError("TinyFish returned no content for the requested URL", "WEB_PROVIDER_ERROR");
		return result;
	}
	/** True when an API key is configured; TinyFish has no keyless endpoint. */
	hasCredentials(options) {
		return options.apiKeyState.value.length > 0;
	}
	/** Request headers; every TinyFish call carries the API key. */
	headers(apiKey) {
		return {
			"x-api-key": apiKey,
			"content-type": "application/json",
			accept: "application/json",
			"user-agent": USER_AGENT
		};
	}
};
/** True when `baseURL` parses as an absolute URL (a cheap local config check). */
function isValidBaseUrl(baseURL) {
	return URL.canParse(baseURL);
}
/** True for a whole number greater than zero. */
function isPositiveInteger(value) {
	return Number.isInteger(value) && value > 0;
}
/** True for a whole number greater than or equal to zero (TinyFish's `ttl`). */
function isNonNegativeInteger(value) {
	return Number.isInteger(value) && value >= 0;
}
/** True for one of TinyFish's accepted `format` values. */
function isSupportedFormat(format) {
	return format === "markdown" || format === "html" || format === "json";
}
/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error) {
	return error instanceof DOMException && error.name === "AbortError";
}
/** Resolve after `ms`; used only by the bounded credential seeding retry. */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Create the API-key access both providers share.
 *
 * A non-empty literal `apiKey` wins; otherwise the key resolves through the
 * credentials service — the provider-managed store first, then ambient
 * fallbacks such as the process environment — or, when no credentials service
 * is mounted, straight from the launch environment. Resolution is
 * asynchronous, so a synchronous snapshot answers `available()`; the `inject`
 * list holds this fiber until the credentials plane is active, and the seed
 * retries briefly as a guard, then the snapshot is refreshed whenever the
 * credential or the config can have changed — a committed credential write
 * (`credentials/reference-updated`) or a volatile-only config update
 * (`loader/volatile-update`).
 *
 * @param ctx - plugin context supplying the credential and environment planes.
 * @param options - thunks reading the live literal key and the credential reference name.
 * @returns the per-operation resolver and the synchronous snapshot.
 */
function createApiKeyAccess(ctx, options) {
	const resolveApiKey = async () => {
		const literal = options.literal();
		if (literal !== void 0) return literal;
		const envName = options.envName();
		const ref = isCredentialRefName(envName) ? credentialRef(envName) : void 0;
		const credentials = ctx.get("credentials");
		if (credentials !== void 0) {
			if (ref === void 0) return void 0;
			return (await credentials.resolve(ref))?.value;
		}
		const ambient = launchEnvironmentOf(ctx).get(envName);
		return ambient !== void 0 && ambient.value.length > 0 ? ambient.value : void 0;
	};
	const apiKeyState = { value: options.literal() ?? launchEnvironmentOf(ctx).get(options.envName())?.value ?? "" };
	const refresh = async () => {
		try {
			apiKeyState.value = (await resolveApiKey()) ?? "";
		} catch {
			// a failed resolution keeps the previous snapshot; the next operation resolves again
		}
	};
	// The `credentials` inject keeps this fiber PENDING until the plane is
	// active, so the first pass below normally succeeds immediately; the
	// bounded retry only covers a resolve that still fails transiently,
	// because nothing re-seeds an empty snapshot afterwards.
	void (async () => {
		for (let attempt = 0; attempt < 50; attempt++) {
			try {
				const value = (await resolveApiKey()) ?? "";
				apiKeyState.value = value;
				if (value.length > 0) return;
			} catch {
				// a failed resolution keeps the previous snapshot; retry shortly
			}
			await sleep(100);
		}
	})();
	ctx.on("credentials/reference-updated", () => void refresh());
	ctx.on("loader/volatile-update", () => void refresh());
	return { resolveApiKey, apiKeyState };
}
/**
 * Resolve the API key one TinyFish operation sends, or fail with guidance.
 *
 * The seam only calls an operation after `available()` saw a key, so this
 * guards the race where the key is removed between selection and dispatch —
 * and names every place a key can come from.
 *
 * @param options - the provider's shared credential access.
 * @param operation - `search` or `fetch`, named in the failure.
 * @returns the resolved key.
 * @throws {@link WebError} `WEB_PROVIDER_CREDENTIAL_MISSING` when no key resolves.
 */
async function requireTinyFishApiKey(options, operation) {
	const apiKey = await options.resolveApiKey();
	if (apiKey === void 0 || apiKey.length === 0) {
		throw new WebError(`TinyFish ${operation} has no API key for "${options.apiKeyEnv}"; store it through the credentials service, export it in the launching environment, or set a literal "apiKey" in the web-search-tinyfish config`, "WEB_PROVIDER_CREDENTIAL_MISSING");
	}
	return apiKey;
}
/**
 * TinyFish-backed `ctx.web` plugin. It registers a search provider and a fetch
 * provider into the web seam without owning the service; both share the same
 * credential resolution (a literal key, the credentials service, or the
 * `TINYFISH_API_KEY` launch environment) and the same two endpoint bases,
 * which are configurable because TinyFish serves search and fetch from
 * different hosts.
 *
 * @module @lliangworld/dsh-web-search-tinyfish
 */
/** Cordis plugin name used by loader diagnostics. */
const name = "web-search-tinyfish";
/**
 * The web seam this provider registers into, plus the credentials plane.
 * Declaring `credentials` makes Cordis hold this fiber PENDING until the
 * credentials service is active — its `Service.init` awaits the store load —
 * so `apply()` never races a not-yet-mounted credential plane. Compositions
 * without a credentials service (e.g. the sdk-minimal template) keep this
 * plugin unloaded instead of degrading to the launch environment.
 */
const inject = ["web", "credentials"];
const Config = z.object({
	apiKey: z.string().role("secret").volatile(),
	apiKeyEnv: z.string().role("credential-ref").default(TINYFISH_API_KEY_ENV).volatile(),
	searchBaseURL: z.string().volatile(),
	fetchBaseURL: z.string().volatile(),
	purpose: z.string().volatile(),
	location: z.string().volatile(),
	language: z.string().volatile(),
	includeDomains: z.string().volatile(),
	excludeDomains: z.string().volatile(),
	domainType: z.union([
		"web",
		"news",
		"research_paper"
	]).volatile(),
	recencyMinutes: z.number().step(1).min(1).max(5256000).volatile(),
	afterDate: z.string().volatile(),
	beforeDate: z.string().volatile(),
	pubYearMin: z.number().step(1).min(0).max(9999).volatile(),
	pubYearMax: z.number().step(1).min(0).max(9999).volatile(),
	page: z.number().step(1).min(0).max(10).volatile(),
	format: z.union([
		"markdown",
		"html",
		"json"
	]).volatile(),
	maxChars: z.number().step(1).min(1).default(50000).volatile(),
	ttl: z.number().step(1).min(0).default(0).volatile(),
	perUrlTimeoutMs: z.number().step(1).min(1).max(110000).default(60000).volatile()
});
/** A non-empty literal key, or `undefined` so resolution falls through. */
function literalApiKey(value) {
	return value !== void 0 && value.length > 0 ? value : void 0;
}
/**
 * Project the live config into the options the providers serve their next
 * operation with. Every field is read through its volatile reference, so a
 * config change reaches the next call without re-registering the providers —
 * a re-registration would make the seam's selection observable to the user
 * as a flicker. Environment fallbacks stay here rather than in the
 * providers: every value they read is already fully defaulted.
 *
 * @param ctx - plugin context supplying the environment plane.
 * @param config - the live config; each field is a volatile reference.
 * @param apiKeyAccess - the credential access both providers share.
 * @returns options for one operation.
 */
function resolveOptions(ctx, config, apiKeyAccess) {
	const purpose = config.purpose.get();
	const location = config.location.get();
	const language = config.language.get();
	const includeDomains = config.includeDomains.get();
	const excludeDomains = config.excludeDomains.get();
	const domainType = config.domainType.get();
	const recencyMinutes = config.recencyMinutes.get();
	const afterDate = config.afterDate.get();
	const beforeDate = config.beforeDate.get();
	const pubYearMin = config.pubYearMin.get();
	const pubYearMax = config.pubYearMax.get();
	const page = config.page.get();
	return {
		...apiKeyAccess,
		apiKeyEnv: config.apiKeyEnv.get() ?? TINYFISH_API_KEY_ENV,
		searchBaseURL: config.searchBaseURL.get() ?? TINYFISH_DEFAULT_SEARCH_BASE_URL,
		fetchBaseURL: config.fetchBaseURL.get() ?? TINYFISH_DEFAULT_FETCH_BASE_URL,
		...purpose !== void 0 ? { purpose } : {},
		...location !== void 0 ? { location } : {},
		...language !== void 0 ? { language } : {},
		...includeDomains !== void 0 ? { includeDomains } : {},
		...excludeDomains !== void 0 ? { excludeDomains } : {},
		...domainType !== void 0 ? { domainType } : {},
		...recencyMinutes !== void 0 ? { recencyMinutes } : {},
		...afterDate !== void 0 ? { afterDate } : {},
		...beforeDate !== void 0 ? { beforeDate } : {},
		...pubYearMin !== void 0 ? { pubYearMin } : {},
		...pubYearMax !== void 0 ? { pubYearMax } : {},
		...page !== void 0 ? { page } : {},
		format: config.format.get() ?? TINYFISH_DEFAULT_FORMAT,
		maxChars: config.maxChars.get(),
		ttl: config.ttl.get(),
		perUrlTimeoutMs: config.perUrlTimeoutMs.get()
	};
}
/**
 * Register the TinyFish search and fetch providers with `ctx.web`.
 *
 * Every TinyFish call needs an API key, resolved per operation from a literal
 * `apiKey`, then the `TINYFISH_API_KEY` credential reference (credentials
 * service, then launch environment); without one both providers stay
 * registered but report `available() === false`, and the seam treats the
 * capability as unconfigured instead of failing every call. A key that
 * resolves empty between selection and the call fails that call with
 * `WEB_PROVIDER_CREDENTIAL_MISSING`. Every config field is volatile, so the
 * same per-operation freshness holds for endpoints, filters, and limits: the
 * loader commits them into the running references instead of restarting the
 * plugin.
 */
function apply(ctx, config) {
	const apiKeyAccess = createApiKeyAccess(ctx, {
		literal: () => literalApiKey(config.apiKey.get()),
		envName: () => config.apiKeyEnv.get() ?? TINYFISH_API_KEY_ENV
	});
	ctx.web.registerSearchProvider(new TinyFishSearchProvider(() => resolveOptions(ctx, config, apiKeyAccess)));
	ctx.web.registerFetchProvider(new TinyFishFetchProvider(() => resolveOptions(ctx, config, apiKeyAccess)));
}
export { Config, TINYFISH_DEFAULT_FETCH_BASE_URL, TINYFISH_DEFAULT_FORMAT, TINYFISH_DEFAULT_MAX_CHARS, TINYFISH_DEFAULT_PER_URL_TIMEOUT_MS, TINYFISH_DEFAULT_SEARCH_BASE_URL, TINYFISH_DEFAULT_TTL, TINYFISH_MAX_PAGE, TINYFISH_MAX_PER_URL_TIMEOUT_MS, TINYFISH_MAX_RECENCY_MINUTES, TINYFISH_MIN_RECENCY_MINUTES, TINYFISH_PROVIDER_ID, TinyFishFetchProvider, TinyFishSearchProvider, apply, inject, name };
