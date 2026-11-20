package com.worldlens.app.domain.model

data class TranslatorLanguage(
    val code: String,
    val name: String,
    val nativeName: String,
    val speechLocaleTag: String
)

enum class TranslatorTab {
    TEXT,
    CAMERA,
    VOICE,
    CONVERSATION,
    HISTORY
}

enum class TranslationErrorType {
    EMPTY_INPUT,
    TEXT_TOO_LONG,
    NETWORK,
    QUOTA_EXCEEDED,
    UNSUPPORTED_LANGUAGE,
    INVALID_IMAGE,
    AI_UNAVAILABLE,
    UNKNOWN
}

data class TextTranslationOutput(
    val sourceText: String,
    val translatedText: String,
    val detectedSourceLanguage: String?,
    val targetLanguageName: String,
    val modelName: String
)

data class CameraTranslationOutput(
    val extractedText: String,
    val translatedText: String,
    val detectedSourceLanguage: String?,
    val hasReadableText: Boolean,
    val readabilityNote: String?,
    val targetLanguageName: String,
    val modelName: String
)

data class ConversationTurn(
    val id: String,
    val speakerLabel: String,
    val isPersonA: Boolean,
    val sourceLanguageCode: String,
    val sourceLanguageName: String,
    val targetLanguageCode: String,
    val targetLanguageName: String,
    val targetSpeechLocale: String,
    val originalText: String,
    val translatedText: String
)

data class LocalTranslationRecord(
    val id: String,
    val mode: String,
    val sourceLanguageCode: String,
    val sourceLanguageName: String,
    val targetLanguageCode: String,
    val targetLanguageName: String,
    val sourceText: String,
    val translatedText: String,
    val timestampMillis: Long
)

object TranslatorLanguages {
    val AUTO_DETECT = TranslatorLanguage(
        code = "auto",
        name = "Auto-detect",
        nativeName = "Auto-detect",
        speechLocaleTag = ""
    )

    // 105 widely used languages supported by Gemini multimodal models
    val ALL_LANGUAGES: List<TranslatorLanguage> = listOf(
        TranslatorLanguage("en", "English", "English", "en-US"),
        TranslatorLanguage("hi", "Hindi", "हिन्दी", "hi-IN"),
        TranslatorLanguage("bn", "Bengali", "বাংলা", "bn-IN"),
        TranslatorLanguage("te", "Telugu", "తెలుగు", "te-IN"),
        TranslatorLanguage("mr", "Marathi", "मराठी", "mr-IN"),
        TranslatorLanguage("ta", "Tamil", "தமிழ்", "ta-IN"),
        TranslatorLanguage("gu", "Gujarati", "ગુજરાતી", "gu-IN"),
        TranslatorLanguage("kn", "Kannada", "ಕನ್ನಡ", "kn-IN"),
        TranslatorLanguage("ml", "Malayalam", "മലയാളം", "ml-IN"),
        TranslatorLanguage("pa", "Punjabi", "ਪੰਜਾਬੀ", "pa-IN"),
        TranslatorLanguage("ur", "Urdu", "اردو", "ur-PK"),
        TranslatorLanguage("or", "Odia", "ଓଡ଼ିଆ", "or-IN"),
        TranslatorLanguage("as", "Assamese", "অসমীয়া", "as-IN"),
        TranslatorLanguage("ne", "Nepali", "नेपाली", "ne-NP"),
        TranslatorLanguage("si", "Sinhala", "සිංහල", "si-LK"),
        TranslatorLanguage("sa", "Sanskrit", "संस्कृतम्", "sa-IN"),
        TranslatorLanguage("sd", "Sindhi", "سنڌي", "sd-PK"),
        TranslatorLanguage("mai", "Maithili", "मैथिली", "mai-IN"),
        TranslatorLanguage("kok", "Konkani", "कोंकणी", "kok-IN"),
        TranslatorLanguage("es", "Spanish", "Español", "es-ES"),
        TranslatorLanguage("fr", "French", "Français", "fr-FR"),
        TranslatorLanguage("de", "German", "Deutsch", "de-DE"),
        TranslatorLanguage("it", "Italian", "Italiano", "it-IT"),
        TranslatorLanguage("pt", "Portuguese", "Português", "pt-BR"),
        TranslatorLanguage("ru", "Russian", "Русский", "ru-RU"),
        TranslatorLanguage("zh-CN", "Chinese (Simplified)", "简体中文", "zh-CN"),
        TranslatorLanguage("zh-TW", "Chinese (Traditional)", "繁體中文", "zh-TW"),
        TranslatorLanguage("ja", "Japanese", "日本語", "ja-JP"),
        TranslatorLanguage("ko", "Korean", "한국어", "ko-KR"),
        TranslatorLanguage("ar", "Arabic", "العربية", "ar-SA"),
        TranslatorLanguage("tr", "Turkish", "Türkçe", "tr-TR"),
        TranslatorLanguage("vi", "Vietnamese", "Tiếng Việt", "vi-VN"),
        TranslatorLanguage("th", "Thai", "ไทย", "th-TH"),
        TranslatorLanguage("id", "Indonesian", "Bahasa Indonesia", "id-ID"),
        TranslatorLanguage("ms", "Malay", "Bahasa Melayu", "ms-MY"),
        TranslatorLanguage("fil", "Filipino", "Filipino", "fil-PH"),
        TranslatorLanguage("nl", "Dutch", "Nederlands", "nl-NL"),
        TranslatorLanguage("pl", "Polish", "Polski", "pl-PL"),
        TranslatorLanguage("uk", "Ukrainian", "Українська", "uk-UA"),
        TranslatorLanguage("cs", "Czech", "Čeština", "cs-CZ"),
        TranslatorLanguage("el", "Greek", "Ελληνικά", "el-GR"),
        TranslatorLanguage("he", "Hebrew", "עברית", "he-IL"),
        TranslatorLanguage("fa", "Persian", "فارسی", "fa-IR"),
        TranslatorLanguage("sv", "Swedish", "Svenska", "sv-SE"),
        TranslatorLanguage("no", "Norwegian", "Norsk", "nb-NO"),
        TranslatorLanguage("da", "Danish", "Dansk", "da-DK"),
        TranslatorLanguage("fi", "Finnish", "Suomi", "fi-FI"),
        TranslatorLanguage("ro", "Romanian", "Română", "ro-RO"),
        TranslatorLanguage("hu", "Hungarian", "Magyar", "hu-HU"),
        TranslatorLanguage("bg", "Bulgarian", "Български", "bg-BG"),
        TranslatorLanguage("hr", "Croatian", "Hrvatski", "hr-HR"),
        TranslatorLanguage("sr", "Serbian", "Српски", "sr-RS"),
        TranslatorLanguage("sk", "Slovak", "Slovenčina", "sk-SK"),
        TranslatorLanguage("sl", "Slovenian", "Slovenščina", "sl-SI"),
        TranslatorLanguage("lt", "Lithuanian", "Lietuvių", "lt-LT"),
        TranslatorLanguage("lv", "Latvian", "Latviešu", "lv-LV"),
        TranslatorLanguage("et", "Estonian", "Eesti", "et-EE"),
        TranslatorLanguage("sw", "Swahili", "Kiswahili", "sw-KE"),
        TranslatorLanguage("am", "Amharic", "አማርኛ", "am-ET"),
        TranslatorLanguage("yo", "Yoruba", "Yorùbá", "yo-NG"),
        TranslatorLanguage("ig", "Igbo", "Igbo", "ig-NG"),
        TranslatorLanguage("ha", "Hausa", "Hausa", "ha-NG"),
        TranslatorLanguage("zu", "Zulu", "isiZulu", "zu-ZA"),
        TranslatorLanguage("xh", "Xhosa", "isiXhosa", "xh-ZA"),
        TranslatorLanguage("af", "Afrikaans", "Afrikaans", "af-ZA"),
        TranslatorLanguage("so", "Somali", "Soomaali", "so-SO"),
        TranslatorLanguage("rw", "Kinyarwanda", "Ikinyarwanda", "rw-RW"),
        TranslatorLanguage("mg", "Malagasy", "Malagasy", "mg-MG"),
        TranslatorLanguage("sn", "Shona", "chiShona", "sn-ZW"),
        TranslatorLanguage("my", "Burmese", "မြန်မာ", "my-MM"),
        TranslatorLanguage("km", "Khmer", "ខ្មែរ", "km-KH"),
        TranslatorLanguage("lo", "Lao", "ລາວ", "lo-LA"),
        TranslatorLanguage("mn", "Mongolian", "Монгол", "mn-MN"),
        TranslatorLanguage("kk", "Kazakh", "Қазақша", "kk-KZ"),
        TranslatorLanguage("uz", "Uzbek", "Oʻzbekcha", "uz-UZ"),
        TranslatorLanguage("ky", "Kyrgyz", "Кыргызча", "ky-KG"),
        TranslatorLanguage("tg", "Tajik", "Тоҷикӣ", "tg-TJ"),
        TranslatorLanguage("tk", "Turkmen", "Türkmençe", "tk-TM"),
        TranslatorLanguage("az", "Azerbaijani", "Azərbaycan", "az-AZ"),
        TranslatorLanguage("hy", "Armenian", "Հայերեն", "hy-AM"),
        TranslatorLanguage("ka", "Georgian", "ქართული", "ka-GE"),
        TranslatorLanguage("sq", "Albanian", "Shqip", "sq-AL"),
        TranslatorLanguage("mk", "Macedonian", "Македонски", "mk-MK"),
        TranslatorLanguage("bs", "Bosnian", "Bosanski", "bs-BA"),
        TranslatorLanguage("is", "Icelandic", "Íslenska", "is-IS"),
        TranslatorLanguage("ga", "Irish", "Gaeilge", "ga-IE"),
        TranslatorLanguage("cy", "Welsh", "Cymraeg", "cy-GB"),
        TranslatorLanguage("gd", "Scottish Gaelic", "Gàidhlig", "gd-GB"),
        TranslatorLanguage("eu", "Basque", "Euskara", "eu-ES"),
        TranslatorLanguage("ca", "Catalan", "Català", "ca-ES"),
        TranslatorLanguage("gl", "Galician", "Galego", "gl-ES"),
        TranslatorLanguage("mt", "Maltese", "Malti", "mt-MT"),
        TranslatorLanguage("lb", "Luxembourgish", "Lëtzebuergesch", "lb-LU"),
        TranslatorLanguage("be", "Belarusian", "Беларуская", "be-BY"),
        TranslatorLanguage("ps", "Pashto", "پښتو", "ps-AF"),
        TranslatorLanguage("ku", "Kurdish", "Kurdî", "ku-TR"),
        TranslatorLanguage("ceb", "Cebuano", "Cebuano", "ceb-PH"),
        TranslatorLanguage("jv", "Javanese", "Basa Jawa", "jv-ID"),
        TranslatorLanguage("su", "Sundanese", "Basa Sunda", "su-ID"),
        TranslatorLanguage("ht", "Haitian Creole", "Kreyòl Ayisyen", "ht-HT"),
        TranslatorLanguage("qu", "Quechua", "Runasimi", "qu-PE"),
        TranslatorLanguage("gn", "Guarani", "Avañe'ẽ", "gn-PY"),
        TranslatorLanguage("mi", "Maori", "Te Reo Māori", "mi-NZ"),
        TranslatorLanguage("sm", "Samoan", "Gagana Sāmoa", "sm-WS"),
        TranslatorLanguage("la", "Latin", "Latina", "la")
    )

    fun findByCode(code: String): TranslatorLanguage {
        if (code == AUTO_DETECT.code) return AUTO_DETECT
        return ALL_LANGUAGES.firstOrNull { it.code == code } ?: ALL_LANGUAGES.first()
    }

    fun findByNameOrCode(query: String?): TranslatorLanguage? {
        val cleaned = query?.trim()?.lowercase()?.takeIf { it.isNotEmpty() } ?: return null
        return ALL_LANGUAGES.firstOrNull { lang ->
            lang.code.lowercase() == cleaned ||
                lang.name.lowercase() == cleaned ||
                lang.nativeName.lowercase() == cleaned
        }
    }
}
