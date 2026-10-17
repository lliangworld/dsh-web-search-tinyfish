window.__ModuleLoader__.load({
	id: "@customize/dsh-web-search-tinyfish",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region lib/types/client/locales.js
		/** Locale bundles for the TinyFish settings card. */
		/** English copy. */
		const en = {
			title: "TinyFish",
			description: "TinyFish-backed search and fetch: ranked results optimized for LLMs, and pages rendered in a real browser as markdown, HTML, or JSON.",
			apiKey: "API key",
			apiKeyHint: "Stored outside the settings file, under the TINYFISH_API_KEY credential reference. Leave blank to keep the current key.",
			apiKeySet: "A key is configured.",
			apiKeyUnset: "No key is configured; both providers report unavailable until one is stored.",
			searchBaseURL: "Search endpoint base",
			searchBaseURLHint: "TinyFish search endpoint; every request is a GET against it. Leave blank to restore the default.",
			fetchBaseURL: "Fetch endpoint base",
			fetchBaseURLHint: "TinyFish fetch endpoint, a different host from search; every request is a POST against it. Leave blank to restore the default.",
			format: "Fetch output format",
			formatHint: "Extracted content format: markdown, html, or json. Leave blank to restore the default.",
			maxChars: "Fetch character cap",
			maxCharsHint: "Total-character cap applied to a fetched page before returning it. Leave blank to restore the default.",
			ttl: "Cache freshness",
			ttlHint: "Cache freshness in seconds: 0 = always live; positive = accept cache younger than N seconds. Leave blank to restore the default.",
			perUrlTimeoutMs: "Per-URL timeout",
			perUrlTimeoutMsHint: "Per-URL timeout budget forwarded to TinyFish: 1–110000 milliseconds. Leave blank to restore the default.",
			purpose: "Search purpose",
			purposeHint: "Optional statement of why you search, sent as TinyFish's purpose; improves result quality, max 2000 characters. Leave blank for none.",
			location: "Location",
			locationHint: "Country code for geo-targeted results, such as US or CN. Leave blank for none.",
			language: "Language",
			languageHint: "Result language code, such as en or zh. Leave blank for none.",
			includeDomains: "Include domains",
			includeDomainsHint: "Comma-separated domains to restrict results to. Leave blank for none.",
			excludeDomains: "Exclude domains",
			excludeDomainsHint: "Comma-separated domains to exclude from results. Leave blank for none.",
			domainType: "Result kind",
			domainTypeHint: "web, news, or research_paper. Leave blank to restore the default.",
			recencyMinutes: "Freshness window",
			recencyMinutesHint: "Freshness window in minutes, 1–5256000; cannot combine with the date bounds. Leave blank for none.",
			afterDate: "After date",
			afterDateHint: "Lower date bound, YYYY-MM-DD. Leave blank for none.",
			beforeDate: "Before date",
			beforeDateHint: "Upper date bound, YYYY-MM-DD, not earlier than the lower bound. Leave blank for none.",
			pubYearMin: "Earliest publication year",
			pubYearMinHint: "Publication-year lower bound, 0–9999; research_paper results only. Leave blank for none.",
			pubYearMax: "Latest publication year",
			pubYearMaxHint: "Publication-year upper bound, 0–9999; research_paper results only. Leave blank for none.",
			page: "Result page",
			pageHint: "Default result page, zero-based, 0–10; TinyFish returns one server-sized page per call. Leave blank to restore the default.",
			advancedShow: "Advanced settings",
			advancedHide: "Hide advanced settings",
			defaultValue: "Default: {value}.",
			noDefault: "No default.",
			overridden: "Overridden",
			reset: "Reset to default",
			invalidText: "Enter one of: markdown, html, json. Leave blank to restore the default.",
			invalidDomainType: "Enter one of: web, news, research_paper. Leave blank to restore the default.",
			invalidChars: "Enter a positive integer, or leave blank to use the default.",
			invalidTtl: "Enter a non-negative integer, or leave blank to use the default.",
			invalidTimeout: "Enter an integer from 1 to 110000, or leave blank to use the default.",
			invalidRecency: "Enter an integer from 1 to 5256000, or leave blank to use the default.",
			invalidYear: "Enter an integer from 0 to 9999, or leave blank to use the default.",
			invalidPage: "Enter an integer from 0 to 10, or leave blank to use the default.",
			unavailable: "This plugin is not loaded, so it cannot be configured right now.",
			readOnly: "This deployment stores settings read-only.",
			save: "Save",
			saving: "Saving…",
			saveFailed: "The deployment did not accept these values; they were left for you to correct."
		};
		/** Simplified Chinese copy. */
		const zh = {
			title: "TinyFish",
			description: "基于 TinyFish 的搜索与抓取：面向 LLM 优化的排序结果，以及真实浏览器渲染的 markdown、HTML 或 JSON 页面内容。",
			apiKey: "API Key",
			apiKeyHint: "密钥不写入设置文件，保存在 TINYFISH_API_KEY 凭据引用下。留空表示保持当前密钥。",
			apiKeySet: "已配置密钥。",
			apiKeyUnset: "未配置密钥；存入密钥前两个提供方都报告不可用。",
			searchBaseURL: "搜索端点基址",
			searchBaseURLHint: "TinyFish 搜索端点；所有请求以 GET 发往此处。留空恢复默认。",
			fetchBaseURL: "抓取端点基址",
			fetchBaseURLHint: "TinyFish 抓取端点，与搜索不同域；所有请求以 POST 发往此处。留空恢复默认。",
			format: "抓取输出格式",
			formatHint: "提取内容的格式：markdown、html 或 json。留空恢复默认。",
			maxChars: "抓取字符上限",
			maxCharsHint: "返回前对页面正文施加的字符上限。留空恢复默认。",
			ttl: "缓存新鲜度",
			ttlHint: "缓存新鲜度（秒）：0 = 总是实时抓取；正数 = 接受 N 秒内的缓存。留空恢复默认。",
			perUrlTimeoutMs: "单 URL 超时",
			perUrlTimeoutMsHint: "转发给 TinyFish 的单 URL 超时预算：1–110000 毫秒。留空恢复默认。",
			purpose: "搜索目的",
			purposeHint: "可选，说明搜索目的，作为 TinyFish 的 purpose 发送；可提升结果质量，最长 2000 字符。留空表示不发送。",
			location: "地域",
			locationHint: "地域国家代码，如 US、CN。留空表示不限制。",
			language: "语言",
			languageHint: "结果语言代码，如 en、zh。留空表示不限制。",
			includeDomains: "限定域名",
			includeDomainsHint: "逗号分隔，限定结果域名。留空表示不限制。",
			excludeDomains: "排除域名",
			excludeDomainsHint: "逗号分隔，排除结果域名。留空表示不排除。",
			domainType: "结果类型",
			domainTypeHint: "web、news 或 research_paper。留空恢复默认。",
			recencyMinutes: "时效窗口",
			recencyMinutesHint: "时效窗口（分钟，1–5256000）；不可与日期边界同时使用。留空表示不限制。",
			afterDate: "起始日期",
			afterDateHint: "起始日期，YYYY-MM-DD。留空表示不限制。",
			beforeDate: "截止日期",
			beforeDateHint: "截止日期，YYYY-MM-DD，不早于起始日期。留空表示不限制。",
			pubYearMin: "最早发表年份",
			pubYearMinHint: "发表年份下界，0–9999；仅 research_paper 结果。留空表示不限制。",
			pubYearMax: "最晚发表年份",
			pubYearMaxHint: "发表年份上界，0–9999；仅 research_paper 结果。留空表示不限制。",
			page: "结果页码",
			pageHint: "默认结果页码，从 0 开始，0–10；TinyFish 每次调用返回一页服务端固定大小的结果。留空恢复默认。",
			advancedShow: "高级设置",
			advancedHide: "收起高级设置",
			defaultValue: "默认值：{value}。",
			noDefault: "无默认值。",
			overridden: "已覆盖",
			reset: "恢复默认",
			invalidText: "请填 markdown、html 或 json。留空恢复默认。",
			invalidDomainType: "请填 web、news 或 research_paper。留空恢复默认。",
			invalidChars: "请填正整数，或留空使用默认值。",
			invalidTtl: "请填非负整数，或留空使用默认值。",
			invalidTimeout: "请填 1–110000 的整数，或留空使用默认值。",
			invalidRecency: "请填 1–5256000 的整数，或留空使用默认值。",
			invalidYear: "请填 0–9999 的整数，或留空使用默认值。",
			invalidPage: "请填 0–10 的整数，或留空使用默认值。",
			unavailable: "该插件当前未加载，暂时无法配置。",
			readOnly: "本部署的设置为只读。",
			save: "保存",
			saving: "保存中…",
			saveFailed: "本部署未接受这些值；请修正后重试。"
		};
		/**
		 * The form frame's copy, read from this card's dictionary.
		 * @param t - the card's locale reader.
		 * @returns the labels the shared settings form renders.
		 */
		function formLabels(t) {
			return {
				unavailable: t("unavailable"),
				readOnly: t("readOnly"),
				saveFailed: t("saveFailed"),
				save: t("save"),
				saving: t("saving")
			};
		}
		//#endregion
		//#region lib/types/client/fields.js
		/**
		 * Parse one of a fixed set of strings: blank clears the override, an
		 * unlisted value is invalid so the form blocks the save.
		 * @param values - the accepted strings.
		 * @returns the field's parse function.
		 */
		function oneOf(values) {
			return (text) => {
				const value = text.trim();
				if (value === "") return { kind: "clear" };
				return values.includes(value) ? { kind: "set", value } : void 0;
			};
		}
		/**
		 * Parse a bounded whole number: blank clears the override, a
		 * non-integer or out-of-range value is invalid.
		 * @param min - the inclusive lower bound.
		 * @param max - the inclusive upper bound.
		 * @returns the field's parse function.
		 */
		function boundedInt(min, max) {
			return (text) => {
				if (text.trim() === "") return { kind: "clear" };
				const value = Number(text);
				return Number.isInteger(value) && value >= min && value <= max ? { kind: "set", value } : void 0;
			};
		}
		/** The form fields the card edits, with the parse each one needs. */
		function tinyfishFields() {
			return [
				(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("searchBaseURL"),
				(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("fetchBaseURL"),
				{
					...(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("format"),
					parse: oneOf(["markdown", "html", "json"])
				},
				{
					...(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)("maxChars"),
					parse: boundedInt(1, Number.MAX_SAFE_INTEGER)
				},
				{
					...(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)("ttl"),
					parse: boundedInt(0, Number.MAX_SAFE_INTEGER)
				},
				{
					...(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)("perUrlTimeoutMs"),
					parse: boundedInt(1, 11e4)
				},
				(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("purpose"),
				(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("location"),
				(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("language"),
				(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("includeDomains"),
				(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("excludeDomains"),
				{
					...(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("domainType"),
					parse: oneOf(["web", "news", "research_paper"])
				},
				{
					...(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)("recencyMinutes"),
					parse: boundedInt(1, 5256e3)
				},
				(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("afterDate"),
				(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("beforeDate"),
				{
					...(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)("pubYearMin"),
					parse: boundedInt(0, 9999)
				},
				{
					...(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)("pubYearMax"),
					parse: boundedInt(0, 9999)
				},
				{
					...(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)("page"),
					parse: boundedInt(0, 10)
				}
			];
		}
		/**
		 * The value fields the card renders, in order: the config field, the
		 * dictionary key of its invalid-value message, whether it is numeric,
		 * and whether the advanced group holds it. The endpoints and the fetch
		 * behaviour stay in the open group; the search filters are advanced.
		 */
		const VALUE_FIELDS = [
			{ name: "searchBaseURL", invalid: "invalidText" },
			{ name: "fetchBaseURL", invalid: "invalidText" },
			{ name: "format", invalid: "invalidText" },
			{ name: "maxChars", invalid: "invalidChars", numeric: true },
			{ name: "ttl", invalid: "invalidTtl", numeric: true },
			{ name: "perUrlTimeoutMs", invalid: "invalidTimeout", numeric: true },
			{ name: "purpose", invalid: "invalidText", advanced: true },
			{ name: "location", invalid: "invalidText", advanced: true },
			{ name: "language", invalid: "invalidText", advanced: true },
			{ name: "includeDomains", invalid: "invalidText", advanced: true },
			{ name: "excludeDomains", invalid: "invalidText", advanced: true },
			{ name: "domainType", invalid: "invalidDomainType", advanced: true },
			{ name: "recencyMinutes", invalid: "invalidRecency", numeric: true, advanced: true },
			{ name: "afterDate", invalid: "invalidText", advanced: true },
			{ name: "beforeDate", invalid: "invalidText", advanced: true },
			{ name: "pubYearMin", invalid: "invalidYear", numeric: true, advanced: true },
			{ name: "pubYearMax", invalid: "invalidYear", numeric: true, advanced: true },
			{ name: "page", invalid: "invalidPage", numeric: true, advanced: true }
		];
		/**
		 * Host-side fallbacks for fields whose schema carries no default: the
		 * value the provider uses when the config names none. They live beside
		 * the card because the settings schema alone cannot show them; keep
		 * them in step with the provider's own constants.
		 */
		const FALLBACK_DEFAULTS = {
			searchBaseURL: "https://api.search.tinyfish.ai",
			fetchBaseURL: "https://api.fetch.tinyfish.ai"
		};
		//#endregion
		//#region lib/types/client/styles.js
		/** Card-local styles: the advanced group's chevron. */
		const css = ".dshTinyfishChevron{transition:transform .15s}.dshTinyfishChevronOpen{transform:rotate(180deg)}";
		const tagId = "@customize/dsh-web-search-tinyfish/TinyFishCard.css";
		//#endregion
		//#region lib/types/client/TinyFishCard.js
		/**
		 * The default a field falls back to: the value the inherited layer
		 * holds, or the provider's own fallback for a field whose schema
		 * carries no default. The card shows it as the field's text while no
		 * override is staged, and names it in the hint.
		 * @param state - the card's current snapshot.
		 * @param name - the config field.
		 * @returns the default, or undefined when the field has none.
		 */
		function placeholderOf(state, name) {
			const value = state.defaults?.[name];
			return value === void 0 || value === null ? void 0 : String(value);
		}
		/**
		 * Render one value field row.
		 * @param props - the card's props, whose actions write the field.
		 * @param t - the card's locale reader.
		 * @param state - the card's current snapshot.
		 * @param field - the field descriptor from {@link VALUE_FIELDS}.
		 * @param disabled - whether the form refuses edits right now.
		 * @returns the field row.
		 */
		function valueField(props, t, state, field, disabled) {
			const defaultValue = placeholderOf(state, field.name) ?? FALLBACK_DEFAULTS[field.name];
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
				id: `plugin-config-tinyfish-${field.name}`,
				label: t(field.name),
				hint: `${t(`${field.name}Hint`)} ${defaultValue === void 0 ? t("noDefault") : t("defaultValue", { value: defaultValue })}`,
				placeholder: defaultValue,
				overriddenLabel: t("overridden"),
				resetLabel: t("reset"),
				invalidLabel: t(field.invalid),
				...field.numeric === true ? { numeric: true } : {},
				disabled,
				...state[field.name],
				text: state[field.name].overridden ? state[field.name].text : defaultValue ?? "",
				onEdit: (text) => {
					props.edit(field.name, text);
				},
				onReset: () => {
					props.resetField(field.name);
				}
			}, field.name);
		}
		/**
		 * Render the TinyFish provider's one-liner or its settings form, as the
		 * Plugins page asks.
		 * @param props - the view asked for, locale copy, the form snapshot, and its actions.
		 * @returns the one-liner, or the form.
		 */
		function TinyFishCard(props) {
			const { t } = props;
			const state = props.useTinyFishCard((snapshot) => snapshot);
			if (props.view === "summary") return t("description");
			const disabled = !state.writable || state.saving;
			return (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.SettingsForm, {
				labels: formLabels(t),
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsSecretField, {
						id: "plugin-config-tinyfish-key",
						label: t("apiKey"),
						hint: t("apiKeyHint"),
						disabled: !state.apiKeyWritable,
						text: state.apiKey.text,
						configured: state.apiKeyConfigured,
						stateLabel: state.apiKeyConfigured ? t("apiKeySet") : t("apiKeyUnset"),
						onEdit: (text) => {
							props.edit("apiKey", text);
						}
					}),
					...VALUE_FIELDS.filter((field) => field.advanced !== true).map((field) => valueField(props, t, state, field, disabled)),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						size: "sm",
						disabled,
						onClick: () => {
							props.toggleAdvanced();
						},
						children: [(0, react_jsx_runtime.jsx)("span", { children: t(state.advancedOpen ? "advancedHide" : "advancedShow") }), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, {
							size: 20,
							"aria-hidden": "true",
							className: `dshTinyfishChevron${state.advancedOpen ? " dshTinyfishChevronOpen" : ""}`
						})]
					}),
					...state.advancedOpen === true ? VALUE_FIELDS.filter((field) => field.advanced === true).map((field) => valueField(props, t, state, field, disabled)) : []
				]
			});
		}
		//#endregion
		//#region lib/types/client/tinyfish-card-controller.js
		/** Settings namespace this card edits: the plugin's own row. */
		const NS = "web-search-tinyfish";
		/** Row-configuration key: the bundle package name and the row its patch declares. */
		const ROW_CONFIG_KEY = "@customize/dsh-web-search-tinyfish#web-search-tinyfish";
		/** Credential reference the provider resolves when the config names none. */
		const DEFAULT_API_KEY_REF = "TINYFISH_API_KEY";
		/** Form field the credential control stages under. */
		const API_KEY_FIELD = "apiKey";
		/**
		 * The TinyFish settings card's staged form over the plugin's settings
		 * namespace. The key is the one control that does not live in the
		 * section: its literal never rides a response, so the card learns only
		 * whether one is configured and writes it through the credentials
		 * domain, addressed by the reference the section names. It is still
		 * staged with the rest of the form, so one save covers everything the
		 * card shows.
		 */
		var TinyFishCardController = class {
			scope;
			ctx;
			form;
			store;
			unsubscribe;
			advancedOpen = false;
			base = {};
			credential = {
				ref: "",
				configured: false,
				writable: true
			};
			/**
			 * @param scope - the bound settings scope for the plugin's namespace.
			 * @param ctx - the browser plugin context, whose `remote.credentials`
			 *   namespace answers for the credential the section references.
			 */
			constructor(scope, ctx) {
				this.scope = scope;
				this.ctx = ctx;
				this.form = new _deepseek_ai_dsh_client_ui_primitives.SettingsFormModel(scope, tinyfishFields(), [{
					field: API_KEY_FIELD,
					write: (text) => this.writeKey(text)
				}]);
				this.store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.projection());
				const publish = () => {
					this.store.set(this.projection());
					if (this.ref() !== this.credential.ref) this.readCredential();
				};
				this.base = scope.getSnapshot().base ?? {};
				this.unsubscribe = [this.form.bind(() => this.form.shell()).subscribe(publish), scope.subscribe(() => {
					this.base = scope.getSnapshot().base ?? {};
					this.readCredential();
				})];
				this.readCredential();
			}
			/** The staged form state the card renders. */
			projection() {
				const state = {
					...this.form.shell(),
					advancedOpen: this.advancedOpen,
					defaults: this.base,
					apiKey: this.form.field(API_KEY_FIELD),
					apiKeyConfigured: this.credential.configured,
					apiKeyWritable: this.credential.writable
				};
				for (const field of VALUE_FIELDS) state[field.name] = this.form.field(field.name);
				return state;
			}
			/** The reference the section names, or the provider's default. */
			ref() {
				return refOf(this.scope.getSnapshot());
			}
			/**
			 * Ask the credentials domain about the reference the section currently
			 * names. The answer is stored with the reference it describes, so two
			 * reads settling out of order cannot publish a stale state.
			 */
			async readCredential() {
				const ref = this.ref();
				if (ref !== this.credential.ref) {
					this.credential = {
						ref,
						configured: false,
						writable: true
					};
					this.store.set(this.projection());
				}
				const response = await this.ctx.remote.credentials.describe([ref]);
				if (!response.ok || ref !== this.ref()) return;
				const view = response.value[ref];
				const next = {
					ref,
					configured: view?.configured ?? false,
					writable: view?.writable ?? true
				};
				if (next.configured === this.credential.configured && next.writable === this.credential.writable) return;
				this.credential = next;
				this.store.set(this.projection());
			}
			/**
			 * Re-read after the Host reports a change to the reference this card
			 * watches; a key can be written from somewhere else, and no settings
			 * section changes when it is.
			 * @param ref - the reference the Host reports as changed.
			 */
			refreshCredential(ref) {
				if (ref !== this.credential.ref) return;
				this.readCredential();
			}
			/**
			 * Write the staged key, then re-read whether the Host now holds one.
			 * @param value - the staged credential literal.
			 * @returns whether the Host reports a configured credential afterwards.
			 */
			async writeKey(value) {
				await this.ctx.remote.credentials.set(this.ref(), value);
				await this.readCredential();
				return this.credential.configured;
			}
			/** Open or close the advanced group. */
			toggleAdvanced() {
				this.advancedOpen = !this.advancedOpen;
				this.store.set(this.projection());
			}
			/** Build the face the slot registration injects. */
			inject() {
				return {
					hooks: { tinyFishCard: this.store },
					edit: (field, text) => {
						this.form.actions().edit(field, text);
					},
					resetField: (field) => {
						this.form.actions().resetField(field);
					},
					save: () => {
						this.save();
					},
					discard: () => {
						this.form.actions().discard();
					},
					toggleAdvanced: () => {
						this.toggleAdvanced();
					}
				};
			}
			/** Save the staged form; a refused write stops and keeps the draft. */
			async save() {
				const state = this.projection();
				if (!state.available || state.invalid || state.saving) return;
				await this.form.save();
			}
			/** Release configuration subscriptions. */
			dispose() {
				for (const off of this.unsubscribe) off();
				this.form.dispose();
			}
		};
		/**
		 * The credential reference a section names, or the provider's default.
		 * @param snapshot - the section's current scope snapshot.
		 * @returns the reference to address.
		 */
		function refOf(snapshot) {
			const declared = snapshot.value?.apiKeyEnv;
			return declared !== void 0 && declared.length > 0 ? declared : DEFAULT_API_KEY_REF;
		}
		//#endregion
		//#region lib/types/client/index.js
		/**
		 * The TinyFish settings card, browser half: the API key through the
		 * credentials domain and every volatile config field through the
		 * plugin's settings namespace. The card registers into the Plugins
		 * page's `plugins.row.config` slot while the Host serves the namespace,
		 * so a deployment without the provider shows no trace of it, and a
		 * saved field reaches the next call without a restart.
		 */
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.credentials",
			"configForms"
		];
		/**
		 * Mount the TinyFish settings card while the Host serves its namespace.
		 * @param ctx - the browser plugin context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "web-search-tinyfish: dictionaries");
			ctx.effect(() => {
				if (typeof document === "undefined" || document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") !== null) return () => {};
				const tag = document.createElement("style");
				tag.dataset.plugin = "@customize/dsh-web-search-tinyfish";
				tag.dataset.pluginCss = tagId;
				tag.textContent = css;
				document.head.appendChild(tag);
				return () => {
					tag.remove();
				};
			}, "web-search-tinyfish: card styles");
			const card = new TinyFishCardController(ctx.configForms.get(NS), ctx);
			ctx.effect(() => () => {
				card.dispose();
			}, "web-search-tinyfish: form subscription");
			ctx.effect(() => ctx.remote.$on("credentials/reference-updated", (ref) => {
				card.refreshCredential(ref);
			}), "web-search-tinyfish: credential invalidations");
			ctx.configForms.whileServed([NS], () => ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
				name: "plugins.row.config",
				key: ROW_CONFIG_KEY,
				locale: NS,
				inject: () => card.inject()
			}, TinyFishCard)));
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
