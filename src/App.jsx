import { ENDPOINTS } from "./config.js";
import { useState, useEffect, useRef, useId, useCallback } from "react";
import { Sentry } from "./sentry.js";

// ─── Translations ──────────────────────────────────────────────────────────
const T = {
  en: {
    dir: "ltr", lang: "en",
    appEyebrow: "AI-Powered Opportunity Intelligence",
    appTitle1: "", appTitleAccent: "Vetted", appTitle2: "",
    appTagline: "Score every role against what you actually care about — not what a job board thinks matters.",
    regionTitle: "Select Your Region", regionSubtitle: "Available for North America users.",
    regionContinue: "Continue",
    countries: { us: "United States", ca: "Canada", mx: "Mexico" },
    stepProfile: "Profile", stepFilters: "Filters", stepScore: "Score",
    profileTitle: "Your Profile",
    profileSubtitle: "Builds your personalized scoring framework. Be specific — vague inputs produce generic scores.",
    labelName: "Your Name", labelCurrentTitle: "Current / Most Recent Title",
    labelBackground: "Professional Background Summary", labelCareerGoal: "Career Trajectory Goal",
    labelTargetRoles: "Target Roles / Functions", labelTargetIndustries: "Target Industries",
    labelCompMin: "Minimum Base Salary ($)", labelCompTarget: "Target Base Salary ($)",
    labelLocations: "Location Preferences", labelConstraints: "Hard Constraints",
    labelThreshold: "Scoring Threshold",
    thresholdOptions: [
      { value: 3.0, label: "3.0 — Broad net" }, { value: 3.5, label: "3.5 — Recommended default" },
      { value: 4.0, label: "4.0 — High bar" }, { value: 4.5, label: "4.5 — Near-perfect only" },
    ],
    placeholderName: "First name or full name", placeholderTitle: "e.g. Senior Director, Supply Chain",
    placeholderBackground: "Summarize your experience: industries, functions, scope, key achievements.",
    placeholderGoal: "e.g. COO track within 5 years, SVP Supply Chain",
    placeholderRoles: "Type a role and press Enter", placeholderIndustries: "Type an industry and press Enter",
    placeholderCompMin: "e.g. 180000", placeholderCompTarget: "e.g. 220000",
    placeholderLocations: "Type a location and press Enter",
    placeholderConstraints: "e.g. No relocation to Northeast, Must have equity",
    btnBuildFramework: "Build My Filter Framework",
    filtersTitle: "Your Filter Framework",
    filtersSubtitle: "Five core filters pre-loaded. Adjust weights and add custom filters.",
    coreFilters: "Core Filters", customFilters: "Custom Filters",
    suggestedFilters: "Suggested for Your Profile", addCustomFilter: "Add Custom Filter",
    labelFilterName: "Filter Name", labelFilterDesc: "What It Measures", labelWeight: "Weight",
    btnAddFilter: "Add Filter", btnBack: "Back", btnStartScoring: "Start Scoring Opportunities",
    dashboardSubtitle: "filters · Threshold", dashboardScored: "scored",
    editFilters: "Edit Filters", submitTitle: "Submit an Opportunity",
    submitSubtitle: "Paste a JD or URL. AI scores it against your personalized framework.",
    tabPaste: "Paste JD", tabUrl: "From URL", labelJD: "Job Description",
    placeholderJD: "Paste the full job description here — title, responsibilities, qualifications, reporting structure.",
    labelUrl: "Job Posting URL", btnFetch: "Fetch", btnFetching: "Fetching…",
    urlNote: "Some job boards block automated access. If fetch fails, paste text directly.",
    fetchedText: "characters extracted.",
    urlFetchError: "Could not extract this posting automatically. Please paste the job description text directly.",
    btnScore: "Score This Opportunity", btnScoring: "Scoring…",
    prevScored: "Previously Scored", threshold: "Threshold",
    emptyState: "No opportunities scored yet. Submit your first role above.",
    backDash: "← Back to Dashboard", recRationale: "Recommendation Rationale",
    honestFit: "Honest Fit Assessment", strengths: "Where You Are Strong", gaps: "Real Gaps",
    filterBreakdown: "Filter Breakdown", narrativeBridge: "Narrative Bridge",
    removeOpp: "Remove this opportunity", aboveThreshold: "Above threshold", belowThreshold: "Below threshold",
    weightedScore: "Vetted Quotient (VQ)",
    pursue: "pursue", pass: "pass", monitor: "monitor",
    loadingMsg: "Analyzing role against your framework…",
    scoringError: "Scoring failed. The AI response may have been malformed. Try again.",
    addTagHint: "Press Enter or comma to add",
    progressLabel: "Step", stepOf: "of", scoreLabel: "Score", outOf: "out of 5",
    removeTagLabel: "Remove",
    filterSuggestions: [
      { name: "Location Viability", description: "Does the role's location align with stated preferences?" },
      { name: "Equity Structure", description: "Is there equity with a credible exit horizon or meaningful upside?" },
      { name: "COO Path Advancement", description: "Does this role explicitly advance toward COO-level scope?" },
      { name: "Travel Tolerance", description: "Is travel requirement within acceptable bounds?" },
      { name: "Industry Alignment", description: "Is the industry a strategic fit for target trajectory?" },
    ],
  },
  es: {
    dir: "ltr", lang: "es",
    appEyebrow: "Inteligencia de Oportunidades con IA",
    appTitle1: "", appTitleAccent: "Vetted", appTitle2: "",
    appTagline: "Evalúa cada rol según lo que realmente te importa.",
    regionTitle: "Selecciona tu Región", regionSubtitle: "Disponible para usuarios en Norteamérica.",
    regionContinue: "Continuar",
    countries: { us: "Estados Unidos", ca: "Canadá", mx: "México" },
    stepProfile: "Perfil", stepFilters: "Filtros", stepScore: "Evaluar",
    profileTitle: "Tu Perfil", profileSubtitle: "Construye la base de tu marco de evaluación personalizado.",
    labelName: "Tu Nombre", labelCurrentTitle: "Título Actual / Más Reciente",
    labelBackground: "Resumen de Trayectoria", labelCareerGoal: "Objetivo de Carrera",
    labelTargetRoles: "Roles Objetivo", labelTargetIndustries: "Industrias Objetivo",
    labelCompMin: "Salario Mínimo ($)", labelCompTarget: "Salario Objetivo ($)",
    labelLocations: "Preferencias de Ubicación", labelConstraints: "Restricciones Absolutas",
    labelThreshold: "Umbral de Puntuación",
    thresholdOptions: [
      { value: 3.0, label: "3.0 — Red amplia" }, { value: 3.5, label: "3.5 — Recomendado" },
      { value: 4.0, label: "4.0 — Listón alto" }, { value: 4.5, label: "4.5 — Solo perfectas" },
    ],
    placeholderName: "Nombre o nombre completo", placeholderTitle: "ej. Director Senior, Cadena de Suministro",
    placeholderBackground: "Resume tu experiencia.", placeholderGoal: "ej. Trayectoria a COO en 5 años",
    placeholderRoles: "Escribe un rol y presiona Enter", placeholderIndustries: "Escribe una industria y presiona Enter",
    placeholderCompMin: "ej. 180000", placeholderCompTarget: "ej. 220000",
    placeholderLocations: "Escribe una ubicación y presiona Enter",
    placeholderConstraints: "ej. Sin reubicación, Debe tener acciones",
    btnBuildFramework: "Construir Mi Marco",
    filtersTitle: "Tu Marco de Filtros", filtersSubtitle: "Cinco filtros principales precargados.",
    coreFilters: "Filtros Principales", customFilters: "Filtros Personalizados",
    suggestedFilters: "Sugeridos para Tu Perfil", addCustomFilter: "Añadir Filtro",
    labelFilterName: "Nombre del Filtro", labelFilterDesc: "Qué Mide", labelWeight: "Peso",
    btnAddFilter: "Añadir", btnBack: "Atrás", btnStartScoring: "Empezar a Evaluar",
    dashboardSubtitle: "filtros · Umbral", dashboardScored: "evaluadas",
    editFilters: "Editar Filtros", submitTitle: "Enviar una Oportunidad",
    submitSubtitle: "Pega una descripción o URL.",
    tabPaste: "Pegar descripción", tabUrl: "Desde URL", labelJD: "Descripción del Trabajo",
    placeholderJD: "Pega la descripción completa aquí.",
    labelUrl: "URL de la Oferta", btnFetch: "Obtener", btnFetching: "Obteniendo…",
    urlNote: "Algunos portales bloquean el acceso automático.",
    fetchedText: "caracteres extraídos.",
    urlFetchError: "No se pudo extraer. Por favor pega el texto directamente.",
    btnScore: "Evaluar esta Oportunidad", btnScoring: "Evaluando…",
    prevScored: "Evaluadas Anteriormente", threshold: "Umbral",
    emptyState: "Ninguna oportunidad evaluada. Envía tu primer rol.",
    backDash: "← Volver al Panel", recRationale: "Justificación",
    honestFit: "Evaluación de Ajuste", strengths: "Dónde Eres Fuerte", gaps: "Brechas Reales",
    filterBreakdown: "Desglose de Filtros", narrativeBridge: "Puente Narrativo",
    removeOpp: "Eliminar esta oportunidad", aboveThreshold: "Sobre el umbral", belowThreshold: "Bajo el umbral",
    weightedScore: "Vetted Quotient (VQ)",
    pursue: "seguir", pass: "pasar", monitor: "monitorear",
    loadingMsg: "Analizando rol…", scoringError: "La evaluación falló. Intenta de nuevo.",
    addTagHint: "Presiona Enter o coma para añadir",
    progressLabel: "Paso", stepOf: "de", scoreLabel: "Puntuación", outOf: "de 5",
    removeTagLabel: "Eliminar",
    filterSuggestions: [
      { name: "Viabilidad de Ubicación", description: "¿La ubicación se alinea con tus preferencias?" },
      { name: "Estructura de Acciones", description: "¿Acciones con horizonte de salida creíble?" },
      { name: "Avance hacia COO", description: "¿Avanza explícitamente hacia nivel COO?" },
      { name: "Tolerancia de Viajes", description: "¿El requisito de viaje es aceptable?" },
      { name: "Alineación Industrial", description: "¿La industria es un ajuste estratégico?" },
    ],
  },
  zh: {
    dir: "ltr", lang: "zh",
    appEyebrow: "AI 驱动的机会智能分析",
    appTitle1: "", appTitleAccent: "Vetted", appTitle2: "",
    appTagline: "根据您真正在意的标准评估每个职位。",
    regionTitle: "选择您的地区", regionSubtitle: "本应用仅对北美地区用户开放。",
    regionContinue: "继续",
    countries: { us: "美国", ca: "加拿大", mx: "墨西哥" },
    stepProfile: "个人资料", stepFilters: "筛选器", stepScore: "评分",
    profileTitle: "您的个人资料", profileSubtitle: "这将构建您个性化评分框架的基础。",
    labelName: "您的姓名", labelCurrentTitle: "当前/最近职位",
    labelBackground: "职业背景摘要", labelCareerGoal: "职业发展目标",
    labelTargetRoles: "目标职位", labelTargetIndustries: "目标行业",
    labelCompMin: "最低底薪（$）", labelCompTarget: "目标底薪（$）",
    labelLocations: "地点偏好", labelConstraints: "硬性限制条件",
    labelThreshold: "评分门槛",
    thresholdOptions: [
      { value: 3.0, label: "3.0 — 宽松标准" }, { value: 3.5, label: "3.5 — 推荐默认值" },
      { value: 4.0, label: "4.0 — 高标准" }, { value: 4.5, label: "4.5 — 仅接近完美" },
    ],
    placeholderName: "名字或全名", placeholderTitle: "例如：高级总监，供应链",
    placeholderBackground: "总结您的经历。", placeholderGoal: "例如：5年内达到COO级别",
    placeholderRoles: "输入职位并按回车", placeholderIndustries: "输入行业并按回车",
    placeholderCompMin: "例如：180000", placeholderCompTarget: "例如：220000",
    placeholderLocations: "输入地点并按回车", placeholderConstraints: "例如：不搬迁至东北部",
    btnBuildFramework: "构建我的筛选框架",
    filtersTitle: "您的筛选框架", filtersSubtitle: "五个核心筛选器已预先加载。",
    coreFilters: "核心筛选器", customFilters: "自定义筛选器",
    suggestedFilters: "为您推荐", addCustomFilter: "添加自定义筛选器",
    labelFilterName: "筛选器名称", labelFilterDesc: "衡量内容", labelWeight: "权重",
    btnAddFilter: "添加", btnBack: "返回", btnStartScoring: "开始评估机会",
    dashboardSubtitle: "个筛选器 · 门槛", dashboardScored: "已评估",
    editFilters: "编辑筛选器", submitTitle: "提交机会",
    submitSubtitle: "粘贴职位描述或输入URL。",
    tabPaste: "粘贴职位描述", tabUrl: "从URL获取", labelJD: "职位描述",
    placeholderJD: "在此粘贴完整的职位描述。",
    labelUrl: "职位发布URL", btnFetch: "获取", btnFetching: "获取中…",
    urlNote: "部分招聘网站会阻止自动访问。",
    fetchedText: "个字符已提取。",
    urlFetchError: "无法自动提取，请直接粘贴文本。",
    btnScore: "评估此机会", btnScoring: "评估中…",
    prevScored: "已评估的机会", threshold: "门槛",
    emptyState: "尚未评估任何机会。",
    backDash: "← 返回仪表板", recRationale: "推荐理由",
    honestFit: "诚实的适配评估", strengths: "您的优势", gaps: "真实差距",
    filterBreakdown: "筛选器详情", narrativeBridge: "叙事桥接",
    removeOpp: "删除此机会", aboveThreshold: "高于门槛", belowThreshold: "低于门槛",
    weightedScore: "Vetted Quotient (VQ)",
    pursue: "追求", pass: "放弃", monitor: "观察",
    loadingMsg: "正在分析职位…", scoringError: "评分失败，请重试。",
    addTagHint: "按回车或逗号添加",
    progressLabel: "步骤", stepOf: "/", scoreLabel: "评分", outOf: "满5分",
    removeTagLabel: "删除",
    filterSuggestions: [
      { name: "地点可行性", description: "职位地点是否符合您的偏好？" },
      { name: "股权结构", description: "是否有具有可信退出前景的股权？" },
      { name: "COO路径推进", description: "此职位是否推进了向COO级别的发展？" },
      { name: "出差容忍度", description: "出差要求是否在可接受范围内？" },
      { name: "行业契合度", description: "该行业是否与您的目标发展轨迹契合？" },
    ],
  },
  fr: {
    dir: "ltr", lang: "fr",
    appEyebrow: "Intelligence d'Opportunités par IA",
    appTitle1: "", appTitleAccent: "Vetted", appTitle2: "",
    appTagline: "Évaluez chaque poste selon ce qui compte vraiment pour vous.",
    regionTitle: "Sélectionnez Votre Région", regionSubtitle: "Disponible en Amérique du Nord.",
    regionContinue: "Continuer",
    countries: { us: "États-Unis", ca: "Canada", mx: "Mexique" },
    stepProfile: "Profil", stepFilters: "Filtres", stepScore: "Évaluer",
    profileTitle: "Votre Profil", profileSubtitle: "Constitue la base de votre cadre d'évaluation personnalisé.",
    labelName: "Votre Nom", labelCurrentTitle: "Titre Actuel / Plus Récent",
    labelBackground: "Résumé du Parcours", labelCareerGoal: "Objectif de Trajectoire",
    labelTargetRoles: "Rôles Cibles", labelTargetIndustries: "Industries Cibles",
    labelCompMin: "Salaire Minimum ($)", labelCompTarget: "Salaire Cible ($)",
    labelLocations: "Préférences de Lieu", labelConstraints: "Contraintes Absolues",
    labelThreshold: "Seuil de Score",
    thresholdOptions: [
      { value: 3.0, label: "3,0 — Filet large" }, { value: 3.5, label: "3,5 — Recommandé" },
      { value: 4.0, label: "4,0 — Barre haute" }, { value: 4.5, label: "4,5 — Quasi-parfait" },
    ],
    placeholderName: "Prénom ou nom complet", placeholderTitle: "ex. Directeur Senior, Supply Chain",
    placeholderBackground: "Résumez votre expérience.", placeholderGoal: "ex. Trajectoire vers COO en 5 ans",
    placeholderRoles: "Saisissez un rôle et appuyez sur Entrée", placeholderIndustries: "Saisissez une industrie et appuyez sur Entrée",
    placeholderCompMin: "ex. 180000", placeholderCompTarget: "ex. 220000",
    placeholderLocations: "Saisissez un lieu et appuyez sur Entrée",
    placeholderConstraints: "ex. Pas de déménagement, Doit avoir des actions",
    btnBuildFramework: "Construire Mon Cadre",
    filtersTitle: "Votre Cadre de Filtres", filtersSubtitle: "Cinq filtres principaux préchargés.",
    coreFilters: "Filtres Principaux", customFilters: "Filtres Personnalisés",
    suggestedFilters: "Suggérés pour Votre Profil", addCustomFilter: "Ajouter un Filtre",
    labelFilterName: "Nom du Filtre", labelFilterDesc: "Ce qu'il Mesure", labelWeight: "Poids",
    btnAddFilter: "Ajouter", btnBack: "Retour", btnStartScoring: "Commencer à Évaluer",
    dashboardSubtitle: "filtres · Seuil", dashboardScored: "évaluées",
    editFilters: "Modifier", submitTitle: "Soumettre une Opportunité",
    submitSubtitle: "Collez une description ou entrez une URL.",
    tabPaste: "Coller la description", tabUrl: "Depuis URL", labelJD: "Description du Poste",
    placeholderJD: "Collez ici la description complète.",
    labelUrl: "URL de l'Offre", btnFetch: "Récupérer", btnFetching: "Récupération…",
    urlNote: "Certains sites bloquent l'accès automatisé.",
    fetchedText: "caractères extraits.",
    urlFetchError: "Impossible d'extraire. Collez le texte directement.",
    btnScore: "Évaluer cette Opportunité", btnScoring: "Évaluation…",
    prevScored: "Précédemment Évaluées", threshold: "Seuil",
    emptyState: "Aucune opportunité évaluée.",
    backDash: "← Retour au Tableau de Bord", recRationale: "Justification",
    honestFit: "Évaluation de Compatibilité", strengths: "Vos Points Forts", gaps: "Lacunes Réelles",
    filterBreakdown: "Détail des Filtres", narrativeBridge: "Pont Narratif",
    removeOpp: "Supprimer cette opportunité", aboveThreshold: "Au-dessus du seuil", belowThreshold: "Sous le seuil",
    weightedScore: "Vetted Quotient (VQ)",
    pursue: "poursuivre", pass: "passer", monitor: "surveiller",
    loadingMsg: "Analyse en cours…", scoringError: "L'évaluation a échoué. Réessayez.",
    addTagHint: "Appuyez sur Entrée ou virgule pour ajouter",
    progressLabel: "Étape", stepOf: "sur", scoreLabel: "Score", outOf: "sur 5",
    removeTagLabel: "Supprimer",
    filterSuggestions: [
      { name: "Viabilité du Lieu", description: "La localisation correspond aux préférences?" },
      { name: "Structure des Actions", description: "Actions avec horizon de sortie crédible?" },
      { name: "Avancement vers COO", description: "Avance vers périmètre COO?" },
      { name: "Tolérance aux Déplacements", description: "Exigences de déplacement acceptables?" },
      { name: "Alignement Industriel", description: "L'industrie est un choix stratégique?" },
    ],
  },
  ar: {
    dir: "rtl", lang: "ar",
    appEyebrow: "ذكاء اصطناعي لتقييم الفرص المهنية",
    appTitle1: "", appTitleAccent: "Vetted", appTitle2: "",
    appTagline: "قيّم كل وظيفة وفق ما يهمك حقاً.",
    regionTitle: "اختر منطقتك", regionSubtitle: "متاح لمستخدمي أمريكا الشمالية.",
    regionContinue: "متابعة",
    countries: { us: "الولايات المتحدة", ca: "كندا", mx: "المكسيك" },
    stepProfile: "الملف الشخصي", stepFilters: "المرشحات", stepScore: "التقييم",
    profileTitle: "ملفك الشخصي", profileSubtitle: "هذا يبني أساس إطار تقييمك الشخصي.",
    labelName: "اسمك", labelCurrentTitle: "المسمى الوظيفي الحالي",
    labelBackground: "ملخص الخلفية المهنية", labelCareerGoal: "هدف المسار المهني",
    labelTargetRoles: "الأدوار المستهدفة", labelTargetIndustries: "الصناعات المستهدفة",
    labelCompMin: "الحد الأدنى للراتب ($)", labelCompTarget: "الراتب المستهدف ($)",
    labelLocations: "تفضيلات الموقع", labelConstraints: "القيود الصارمة",
    labelThreshold: "عتبة التقييم",
    thresholdOptions: [
      { value: 3.0, label: "٣٫٠ — شبكة واسعة" }, { value: 3.5, label: "٣٫٥ — الافتراضي" },
      { value: 4.0, label: "٤٫٠ — معيار مرتفع" }, { value: 4.5, label: "٤٫٥ — شبه مثالي" },
    ],
    placeholderName: "الاسم الأول أو الكامل", placeholderTitle: "مثال: مدير أول، سلسلة التوريد",
    placeholderBackground: "لخّص خبرتك.", placeholderGoal: "مثال: مسار نحو COO خلال 5 سنوات",
    placeholderRoles: "اكتب دوراً واضغط Enter", placeholderIndustries: "اكتب صناعة واضغط Enter",
    placeholderCompMin: "مثال: ١٨٠٠٠٠", placeholderCompTarget: "مثال: ٢٢٠٠٠٠",
    placeholderLocations: "اكتب موقعاً واضغط Enter",
    placeholderConstraints: "مثال: لا انتقال، يجب أن يتضمن أسهماً",
    btnBuildFramework: "بناء إطار المرشحات",
    filtersTitle: "إطار المرشحات", filtersSubtitle: "المرشحات الخمسة الأساسية محملة مسبقاً.",
    coreFilters: "المرشحات الأساسية", customFilters: "المرشحات المخصصة",
    suggestedFilters: "مقترحات لملفك", addCustomFilter: "إضافة مرشح مخصص",
    labelFilterName: "اسم المرشح", labelFilterDesc: "ما يقيسه", labelWeight: "الوزن",
    btnAddFilter: "إضافة", btnBack: "رجوع", btnStartScoring: "البدء في التقييم",
    dashboardSubtitle: "مرشحات · العتبة", dashboardScored: "مُقيَّمة",
    editFilters: "تعديل", submitTitle: "تقديم فرصة",
    submitSubtitle: "الصق الوصف أو أدخل رابطاً.",
    tabPaste: "لصق الوصف", tabUrl: "من رابط", labelJD: "وصف الوظيفة",
    placeholderJD: "الصق وصف الوظيفة الكامل هنا.",
    labelUrl: "رابط الإعلان", btnFetch: "جلب", btnFetching: "جارٍ الجلب…",
    urlNote: "بعض المواقع تحجب الوصول التلقائي.",
    fetchedText: "حرف تم استخراجه.",
    urlFetchError: "تعذّر الاستخراج. الصق النص مباشرة.",
    btnScore: "تقييم هذه الفرصة", btnScoring: "جارٍ التقييم…",
    prevScored: "الفرص المُقيَّمة سابقاً", threshold: "العتبة",
    emptyState: "لم يتم تقييم أي فرصة بعد.",
    backDash: "العودة إلى لوحة التحكم →", recRationale: "مبرر التوصية",
    honestFit: "تقييم صريح للتوافق", strengths: "نقاط قوتك", gaps: "الفجوات الحقيقية",
    filterBreakdown: "تفصيل المرشحات", narrativeBridge: "جسر السرد",
    removeOpp: "إزالة هذه الفرصة", aboveThreshold: "فوق العتبة", belowThreshold: "تحت العتبة",
    weightedScore: "Vetted Quotient (VQ)",
    pursue: "متابعة", pass: "تجاوز", monitor: "مراقبة",
    loadingMsg: "تحليل الدور…", scoringError: "فشل التقييم. حاول مرة أخرى.",
    addTagHint: "اضغط Enter أو فاصلة للإضافة",
    progressLabel: "الخطوة", stepOf: "من", scoreLabel: "الدرجة", outOf: "من ٥",
    removeTagLabel: "إزالة",
    filterSuggestions: [
      { name: "جدوى الموقع", description: "هل موقع الدور يتوافق مع تفضيلاتك؟" },
      { name: "هيكل الأسهم", description: "هل هناك أسهم بأفق خروج موثوق؟" },
      { name: "التقدم نحو COO", description: "هل يدفع هذا الدور نحو نطاق COO؟" },
      { name: "تحمّل السفر", description: "هل متطلبات السفر ضمن الحدود المقبولة؟" },
      { name: "التوافق الصناعي", description: "هل الصناعة خيار استراتيجي لمسارك؟" },
    ],
  },
  vi: {
    dir: "ltr", lang: "vi",
    appEyebrow: "Trí Tuệ Nhân Tạo Phân Tích Cơ Hội",
    appTitle1: "", appTitleAccent: "Vetted", appTitle2: "",
    appTagline: "Đánh giá mỗi vai trò theo những gì bạn thực sự quan tâm.",
    regionTitle: "Chọn Khu Vực của Bạn", regionSubtitle: "Ứng dụng này khả dụng cho người dùng Bắc Mỹ.",
    regionContinue: "Tiếp tục",
    countries: { us: "Hoa Kỳ", ca: "Canada", mx: "Mexico" },
    stepProfile: "Hồ Sơ", stepFilters: "Bộ Lọc", stepScore: "Đánh Giá",
    profileTitle: "Hồ Sơ của Bạn", profileSubtitle: "Xây dựng nền tảng cho khung đánh giá cá nhân hóa của bạn.",
    labelName: "Tên của Bạn", labelCurrentTitle: "Chức Danh Hiện Tại / Gần Nhất",
    labelBackground: "Tóm Tắt Nền Tảng Chuyên Môn", labelCareerGoal: "Mục Tiêu Lộ Trình Sự Nghiệp",
    labelTargetRoles: "Vai Trò Mục Tiêu", labelTargetIndustries: "Ngành Mục Tiêu",
    labelCompMin: "Lương Tối Thiểu ($)", labelCompTarget: "Lương Mục Tiêu ($)",
    labelLocations: "Ưu Tiên Địa Điểm", labelConstraints: "Ràng Buộc Cứng",
    labelThreshold: "Ngưỡng Điểm",
    thresholdOptions: [
      { value: 3.0, label: "3.0 — Lưới rộng" }, { value: 3.5, label: "3.5 — Mặc định đề xuất" },
      { value: 4.0, label: "4.0 — Tiêu chuẩn cao" }, { value: 4.5, label: "4.5 — Gần hoàn hảo" },
    ],
    placeholderName: "Tên hoặc họ tên đầy đủ", placeholderTitle: "vd. Giám đốc Cấp cao, Chuỗi Cung ứng",
    placeholderBackground: "Tóm tắt kinh nghiệm của bạn.", placeholderGoal: "vd. Lộ trình COO trong 5 năm",
    placeholderRoles: "Nhập vai trò và nhấn Enter", placeholderIndustries: "Nhập ngành và nhấn Enter",
    placeholderCompMin: "vd. 180000", placeholderCompTarget: "vd. 220000",
    placeholderLocations: "Nhập địa điểm và nhấn Enter",
    placeholderConstraints: "vd. Không di chuyển, Phải có cổ phần",
    btnBuildFramework: "Xây Dựng Khung Bộ Lọc",
    filtersTitle: "Khung Bộ Lọc của Bạn", filtersSubtitle: "Năm bộ lọc cốt lõi được tải sẵn.",
    coreFilters: "Bộ Lọc Cốt Lõi", customFilters: "Bộ Lọc Tùy Chỉnh",
    suggestedFilters: "Đề Xuất cho Hồ Sơ của Bạn", addCustomFilter: "Thêm Bộ Lọc Tùy Chỉnh",
    labelFilterName: "Tên Bộ Lọc", labelFilterDesc: "Đo Lường Gì", labelWeight: "Trọng Số",
    btnAddFilter: "Thêm", btnBack: "Quay Lại", btnStartScoring: "Bắt Đầu Đánh Giá",
    dashboardSubtitle: "bộ lọc · Ngưỡng", dashboardScored: "đã đánh giá",
    editFilters: "Chỉnh Sửa Bộ Lọc", submitTitle: "Gửi Cơ Hội",
    submitSubtitle: "Dán mô tả công việc hoặc URL.",
    tabPaste: "Dán Mô Tả", tabUrl: "Từ URL", labelJD: "Mô Tả Công Việc",
    placeholderJD: "Dán mô tả công việc đầy đủ vào đây.",
    labelUrl: "URL Tin Tuyển Dụng", btnFetch: "Tải", btnFetching: "Đang tải…",
    urlNote: "Một số trang tuyển dụng chặn truy cập tự động.",
    fetchedText: "ký tự đã trích xuất.",
    urlFetchError: "Không thể trích xuất tự động. Vui lòng dán văn bản trực tiếp.",
    btnScore: "Đánh Giá Cơ Hội Này", btnScoring: "Đang đánh giá…",
    prevScored: "Đã Đánh Giá Trước Đó", threshold: "Ngưỡng",
    emptyState: "Chưa có cơ hội nào được đánh giá.",
    backDash: "← Quay Lại Bảng Điều Khiển", recRationale: "Lý Do Khuyến Nghị",
    honestFit: "Đánh Giá Phù Hợp Thực Tế", strengths: "Điểm Mạnh của Bạn", gaps: "Khoảng Cách Thực Tế",
    filterBreakdown: "Chi Tiết Bộ Lọc", narrativeBridge: "Cầu Nối Tường Thuật",
    removeOpp: "Xóa cơ hội này", aboveThreshold: "Trên ngưỡng", belowThreshold: "Dưới ngưỡng",
    weightedScore: "Vetted Quotient (VQ)",
    pursue: "tiếp tục", pass: "bỏ qua", monitor: "theo dõi",
    loadingMsg: "Đang phân tích vai trò…", scoringError: "Đánh giá thất bại. Thử lại.",
    addTagHint: "Nhấn Enter hoặc dấu phẩy để thêm",
    progressLabel: "Bước", stepOf: "/", scoreLabel: "Điểm", outOf: "/ 5",
    removeTagLabel: "Xóa",
    filterSuggestions: [
      { name: "Khả Thi Về Địa Điểm", description: "Địa điểm có phù hợp với ưu tiên của bạn?" },
      { name: "Cấu Trúc Cổ Phần", description: "Có cổ phần với triển vọng thoái vốn đáng tin cậy?" },
      { name: "Tiến Triển Lộ Trình COO", description: "Vai trò này có đẩy nhanh hướng tới phạm vi COO?" },
      { name: "Chịu Đựng Đi Lại", description: "Yêu cầu đi lại có trong giới hạn chấp nhận được?" },
      { name: "Phù Hợp Ngành", description: "Ngành này có phù hợp chiến lược với lộ trình của bạn?" },
    ],
  },
};

// ─── Default filters ──────────────────────────────────────────────────────
const DEFAULT_FILTERS = [
  { id: "pl_ownership", weight: 1.5, isCore: true,
    name: { en: "Financial Accountability", es: "Responsabilidad Financiera", zh: "财务责任", fr: "Responsabilité Financière", ar: "المساءلة المالية", vi: "Trách Nhiệm Tài Chính" },
    description: { en: "Does the role carry named financial accountability or is it support language?", es: "¿El rol lleva responsabilidad financiera nombrada?", zh: "该职位是否具有明确的财务责任？", fr: "Le rôle porte-t-il une responsabilité financière nommée?", ar: "هل يحمل الدور مسؤولية مالية محددة؟", vi: "Vai trò có trách nhiệm tài chính cụ thể hay chỉ là ngôn ngữ hỗ trợ?" } },
  { id: "reporting_structure", weight: 1.2, isCore: true,
    name: { en: "Access to Leadership", es: "Acceso al Liderazgo", zh: "领导层接触", fr: "Accès au Leadership", ar: "الوصول إلى القيادة", vi: "Tiếp Cận Lãnh Đạo" },
    description: { en: "How many levels from the C-suite? What does visibility mean for trajectory?", es: "¿Cuántos niveles del C-suite?", zh: "距离C级高管有多少层级？", fr: "Combien de niveaux du C-suite?", ar: "كم عدد المستويات من المجموعة التنفيذية؟", vi: "Bao nhiêu cấp bậc so với ban lãnh đạo cấp cao?" } },
  { id: "metric_specificity", weight: 1.3, isCore: true,
    name: { en: "Clear Success Measures", es: "Métricas de Éxito Claras", zh: "明确的成功指标", fr: "Mesures de Succès Claires", ar: "مقاييس نجاح واضحة", vi: "Thước Đo Thành Công Rõ Ràng" },
    description: { en: "Are success metrics explicit and financially anchored, or vague?", es: "¿Las métricas de éxito están declaradas explícitamente?", zh: "成功指标是否明确陈述并以财务为基础？", fr: "Les métriques de succès sont-elles explicites?", ar: "هل مقاييس النجاح محددة بوضوح؟", vi: "Các chỉ số thành công có cụ thể và gắn với tài chính không?" } },
  { id: "scope_language", weight: 1.2, isCore: true,
    name: { en: "Organizational Impact", es: "Impacto Organizacional", zh: "组织影响力", fr: "Impact Organisationnel", ar: "الأثر التنظيمي", vi: "Tác Động Tổ Chức" },
    description: { en: "Is the role enterprise-wide, regional, or single-function? Does scope match title?", es: "¿Es el rol a nivel empresarial, regional o monofuncional?", zh: "该职位是企业级、区域性还是单一职能？", fr: "Le rôle est-il à l'échelle de l'entreprise?", ar: "هل الدور على مستوى المؤسسة أم إقليمي؟", vi: "Vai trò có phạm vi toàn doanh nghiệp, khu vực hay đơn chức năng?" } },
  { id: "title_gap", weight: 1.0, isCore: true,
    name: { en: "Role Integrity", es: "Integridad del Rol", zh: "职位诚信度", fr: "Intégrité du Rôle", ar: "نزاهة الدور", vi: "Tính Toàn Vẹn của Vai Trò" },
    description: { en: "Does the role deliver what the title promises, or is it inflated/understated?", es: "¿El rol entrega lo que promete el título?", zh: "该职位是否兑现了职位名称所承诺的内容？", fr: "Le rôle tient-il les promesses du titre?", ar: "هل يحقق الدور ما يعد به المسمى؟", vi: "Vai trò có đáp ứng những gì chức danh hứa hẹn không?" } },
];

const LANG_OPTIONS = [
  { code: "en", label: "EN", full: "English" },
  { code: "es", label: "ES", full: "Español" },
  { code: "zh", label: "中文", full: "中文" },
  { code: "fr", label: "FR", full: "Français" },
  { code: "ar", label: "عربي", full: "العربية" },
  { code: "vi", label: "VI", full: "Tiếng Việt" },
];

const NA_COUNTRIES = [
  { code: "us", flag: "🇺🇸" },
  { code: "ca", flag: "🇨🇦" },
  { code: "mx", flag: "🇲🇽" },
];

// ─── Weight option labels ─────────────────────────────────────────────────
const WEIGHT_OPTIONS = [
  { value: 0.5, label: "Minor" },
  { value: 1.0, label: "Standard" },
  { value: 1.2, label: "Relevant" },
  { value: 1.3, label: "Important" },
  { value: 1.5, label: "Critical" },
  { value: 2.0, label: "Critical +" },
];

// ─── Input sanitisation ───────────────────────────────────────────────────
const MAX_SHORT = 200;
const MAX_LONG = 2000;
const MAX_JD = 12000;
const MAX_URL = 2048;

function sanitizeText(value, maxLen = MAX_SHORT) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>'"]/g, "").replace(/\r/g, "").slice(0, maxLen).trim();
}

function sanitizeUrl(value) {
  const trimmed = (value || "").trim().slice(0, MAX_URL);
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" ||
      host.startsWith("192.168.") || host.startsWith("10.") ||
      host.startsWith("172.16.") || host.endsWith(".internal") ||
      host === "metadata.google.internal") return "";
    return trimmed;
  } catch { return ""; }
}

// ─── Rate limiting ────────────────────────────────────────────────────────
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_CALLS = 10;
const callLog = [];
function checkRateLimit() {
  const now = Date.now();
  while (callLog.length && callLog[0] < now - RATE_WINDOW_MS) callLog.shift();
  if (callLog.length >= RATE_MAX_CALLS) return false;
  callLog.push(now);
  return true;
}

// ─── CSS builder ──────────────────────────────────────────────────────────
const buildCss = (dir) => `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&family=Noto+Sans+Arabic:wght@300;400;500&family=Noto+Sans+SC:wght@300;400;500&display=swap');
  :root {
    --ink:#0f0e0c;--paper:#f5f5f5;--cream:#e8f0eb;--accent:#0d5c2e;
    --gold:#8a6200;--gold-light:#f5e8d0;--muted:#6b6660;--border:#c8ddd0;
    --success:#0d5c2e;--warn:#8a6200;--pass:#8b1a1a;--pass-bg:#f0d8d8;
    --warn-bg:#fdf3e0;--shadow:0 2px 16px rgba(15,14,12,.08);--r:4px;
    --focus:0 0 0 3px #4a90e2;
  }
  *,::before,::after{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth;overflow-x:hidden}
body{font-family:${dir === "rtl" ? "'Noto Sans Arabic'" : "'DM Sans'"}, sans-serif;background:var(--paper);color:var(--ink);min-height:100vh;direction:${dir};overflow-x:hidden}
  .skip-link{position:absolute;top:-100px;left:0;padding:8px 16px;background:var(--ink);color:#fff;font-size:14px;border-radius:0 0 var(--r) 0;z-index:9999;transition:top .15s}
  .skip-link:focus{top:0;outline:3px solid #4a90e2}
  .app{max-width:860px;margin:0 auto;padding:40px 16px 80px;background:var(--paper);min-height:100vh;overflow-x:hidden;box-sizing:border-box;width:100%}
  .header{text-align:center;margin-bottom:48px;padding-bottom:32px;border-bottom:1px solid var(--border)}
  .header-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
  .header h1{font-family:'Playfair Display',serif;font-size:clamp(36px,7vw,56px);font-weight:700;line-height:1.1;letter-spacing:-.02em;margin-bottom:12px}
  .header h1 span{color:var(--accent)}.header-tagline{font-size:18px;color:var(--ink);margin-top:8px;line-height:1.4;opacity:0.7}
  .header p{color:var(--muted);font-size:15px;max-width:520px;margin:0 auto;line-height:1.7}
  .lang-switcher{display:flex;gap:4px;justify-content:center;margin-bottom:28px;flex-wrap:wrap}
  .lang-btn{padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;font-size:12px;cursor:pointer;color:var(--muted);font-family:inherit;transition:all .15s}
  .lang-btn.active{background:var(--ink);color:#fff;border-color:var(--ink)}
  .lang-btn:hover:not(.active){border-color:var(--muted);color:var(--ink)}
  .lang-btn:focus-visible{outline:none;box-shadow:var(--focus)}
  .progress-bar{display:flex;gap:6px;margin-bottom:40px;align-items:center}
  .progress-step{flex:1;height:4px;background:var(--border);border-radius:2px;transition:background .3s}
  .progress-step.active{background:var(--accent)}.progress-step.done{background:var(--ink)}
  .progress-label{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);letter-spacing:.1em;white-space:nowrap;${dir === "rtl" ? "margin-right:10px" : "margin-left:10px"}}
  .card{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:28px 32px;box-shadow:var(--shadow);margin-bottom:20px}
  .card-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:600;margin-bottom:6px;word-break:break-word;overflow-wrap:break-word}
  .card-subtitle{font-size:13px;color:var(--muted);margin-bottom:24px;line-height:1.6}
  .field{margin-bottom:20px}
  .field label{display:block;font-size:13px;font-weight:500;color:#4a4540;margin-bottom:7px}
  .field .hint{font-size:12px;color:var(--muted);margin-bottom:6px}
  .field input,.field textarea,.field select{width:100%;padding:10px 14px;min-height:44px;border:1.5px solid var(--border);border-radius:var(--r);font-family:inherit;font-size:15px;color:var(--ink);background:var(--paper);transition:border-color .2s;outline:none;text-align:${dir === "rtl" ? "right" : "left"};direction:${dir}}
  .field input:focus,.field textarea:focus,.field select:focus{border-color:#4a90e2;box-shadow:var(--focus)}
  .field input[aria-invalid="true"],.field textarea[aria-invalid="true"]{border-color:var(--accent)}
  .field textarea{resize:vertical;min-height:100px;line-height:1.6}
  .field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:560px){.field-row{grid-template-columns:1fr}}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 24px;border-radius:var(--r);font-family:inherit;font-size:15px;font-weight:500;cursor:pointer;border:none;transition:all .15s}
  .btn:focus-visible{outline:none;box-shadow:var(--focus)}
  .btn-primary{background:var(--ink);color:#fff}.btn-primary:hover:not(:disabled){background:#2a2820}
  .btn-primary:disabled{background:#b0aba3;color:#f5f1eb;cursor:not-allowed}
  .btn-secondary{background:transparent;color:var(--ink);border:1.5px solid var(--border)}.btn-secondary:hover:not(:disabled){border-color:var(--ink)}
  .btn-danger{background:var(--pass-bg);color:var(--pass);border:1px solid #e0c0c0}
  .btn-sm{padding:8px 16px;font-size:13px;min-height:36px}
  .btn-actions{display:flex;gap:10px;margin-top:24px;align-items:center;flex-wrap:wrap}
  .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .tag{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:var(--cream);border:1px solid var(--border);border-radius:20px;font-size:13px;font-weight:500}
  .tag-remove{cursor:pointer;color:var(--muted);background:none;border:none;min-width:24px;min-height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font-size:16px;padding:0;transition:color .15s,background .15s}
  .tag-remove:hover{color:var(--accent);background:var(--pass-bg)}
  .tag-remove:focus-visible{outline:none;box-shadow:var(--focus)}
  .tabs{display:flex;margin-bottom:24px;border-bottom:1px solid var(--border)}
  .tab-btn{padding:10px 20px;min-height:44px;font-size:14px;font-family:inherit;font-weight:500;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;color:var(--muted);transition:all .15s;margin-bottom:-1px}
  .tab-btn[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--ink)}
  .tab-btn:focus-visible{outline:none;box-shadow:inset 0 0 0 2px #4a90e2}
  .score-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:14px}
  .score-high{background:#d4edd9;color:var(--success)}.score-mid{background:var(--gold-light);color:var(--warn)}.score-low{background:var(--pass-bg);color:var(--pass)}
  .recommendation-badge{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:var(--r);font-size:13px;font-weight:600;text-transform:uppercase;border:1.5px solid currentColor;letter-spacing:.04em;white-space:normal;word-break:break-word;max-width:100%}
  .rec-pursue{color:var(--success);background:#c8edda}.rec-pass{color:var(--pass);background:var(--pass-bg)}.rec-monitor{color:var(--warn);background:var(--warn-bg)}
.opp-card{background:#fff;border:1.5px solid var(--border);border-radius:var(--r);padding:20px 24px;margin-bottom:12px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;max-width:100%;box-sizing:border-box;text-align:${dir === "rtl" ? "right" : "left"};font-family:inherit}
  .opp-card:hover{border-color:var(--ink);box-shadow:var(--shadow)}
  .opp-card:focus-visible{outline:none;box-shadow:var(--focus)}
.opp-card-left{flex:1;min-width:0;overflow:hidden}
  .opp-title{font-family:'Playfair Display',serif;font-size:17px;font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .opp-company{font-size:12px;color:var(--muted);font-family:'IBM Plex Mono',monospace}
  .section-label{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:12px}
  .section-label::after{content:'';flex:1;height:1px;background:var(--border)}
  .filter-row{padding:16px 0;border-bottom:1px solid var(--cream)}.filter-row:last-child{border-bottom:none}
  .filter-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:12px}
  .filter-name{font-size:13px;font-weight:600;flex:1}
  .filter-score-dots{display:flex;gap:4px}
  .dot{width:10px;height:10px;border-radius:50%;background:var(--border)}.dot.filled{background:var(--accent)}.dot.gold{background:var(--gold)}
  .filter-rationale{font-size:13px;color:var(--muted);line-height:1.7}
  .filter-score-num{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;min-width:28px;text-align:${dir === "rtl" ? "left" : "right"}}
  .score-bar-wrap{background:var(--cream);border-radius:2px;height:5px;margin:4px 0 8px;overflow:hidden;direction:ltr}
  .score-bar-fill{height:100%;border-radius:2px;transition:width .6s ease}
  .narrative-box{background:var(--cream);border-${dir === "rtl" ? "right" : "left"}:3px solid var(--accent);padding:16px 20px;border-radius:0 var(--r) var(--r) 0;font-size:14px;line-height:1.7;margin-bottom:16px}
  .narrative-box strong{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .fit-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
  @media(max-width:560px){.fit-grid{grid-template-columns:1fr}}
  @media(max-width:420px){.app{padding:24px 12px 80px}.opp-card{padding:14px 16px}.score-badge{padding:4px 10px;font-size:12px}}
  .fit-box{padding:14px 16px;border-radius:var(--r);font-size:13px;line-height:1.7}
  .fit-box strong{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;font-weight:700}
  .fit-box ul{padding-${dir === "rtl" ? "right" : "left"}:16px}.fit-box li{margin-bottom:4px}
  .fit-strength{background:#c8edda;color:#0c3322}.fit-gap{background:var(--pass-bg);color:#3d0f0f}
  .loading-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:16px}
  .spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--ink);border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .loading-text{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--muted);letter-spacing:.1em}
  .alert{padding:12px 16px;border-radius:var(--r);font-size:13px;margin-bottom:16px;line-height:1.6}
  .alert-warn{background:var(--warn-bg);color:var(--warn);border-${dir === "rtl" ? "right" : "left"}:3px solid var(--gold)}
  .alert-error{background:var(--pass-bg);color:var(--pass);border-${dir === "rtl" ? "right" : "left"}:3px solid var(--accent)}
  .custom-filter-row{display:flex;gap:10px;align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--cream)}.custom-filter-row:last-child{border-bottom:none}
  .weight-select{width:110px;flex-shrink:0;min-height:44px}
  .filter-delete-btn{flex-shrink:0;background:none;border:1.5px solid var(--border);color:var(--muted);cursor:pointer;min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;border-radius:var(--r);font-size:18px;transition:color .15s,border-color .15s}
  .filter-delete-btn:hover{color:var(--accent);border-color:var(--accent)}
  .filter-delete-btn:focus-visible{outline:none;box-shadow:var(--focus)}
  .region-gate{max-width:480px;margin:80px auto}
  .country-option{display:flex;align-items:center;gap:10px;padding:12px 16px;min-height:52px;border:1.5px solid var(--border);border-radius:var(--r);margin-bottom:8px;cursor:pointer;transition:all .15s;background:#fff;width:100%;font-family:inherit;font-size:14px;text-align:${dir === "rtl" ? "right" : "left"}}
  .country-option:hover{border-color:var(--ink)}.country-option:focus-visible{outline:none;box-shadow:var(--focus)}
  .country-option[aria-pressed="true"]{border-color:var(--ink);border-width:2px;background:var(--cream);font-weight:600}
  .back-link{background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;display:inline-flex;align-items:center;gap:6px;padding:6px 0;margin-bottom:24px;font-family:inherit;transition:color .15s;min-height:44px}
  .back-link:hover{color:var(--ink)}.back-link:focus-visible{outline:none;box-shadow:var(--focus);border-radius:var(--r)}
.overall-score-display{display:flex;align-items:center;gap:20px;padding:20px 0;margin-bottom:8px;flex-wrap:wrap;box-sizing:border-box;width:100%}  .big-score{font-family:'Playfair Display',serif;font-size:56px;font-weight:700;line-height:1}
  .big-score.high{color:var(--success)}.big-score.mid{color:var(--gold)}.big-score.low{color:var(--accent)}
  .score-meta{flex:1}
.score-meta{flex:1;min-width:0;overflow:hidden}
  .threshold-note{font-size:12px;color:var(--muted);margin-top:4px}
  .url-note{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.6}
  .threshold-label{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--accent);letter-spacing:.1em;text-align:${dir === "rtl" ? "left" : "right"};margin-bottom:4px}
  .empty-state{text-align:center;padding:48px 20px;color:var(--muted)}
  .empty-state-icon{font-size:40px;margin-bottom:12px}
  .empty-state p{font-size:14px;line-height:1.6;max-width:340px;margin:0 auto}
`;

// ─── Shared context passed as props — no component defined inside App ─────
// fn() resolves multilingual field strings
function resolveLang(field, lang) {
  return typeof field === "string" ? field : (field[lang] || field["en"]);
}

// ════════════════════════════════════════════════════════════════════════════
// TOP-LEVEL COMPONENTS — defined at module scope, never recreated on re-render
// ════════════════════════════════════════════════════════════════════════════

// ─── LangSwitcher ─────────────────────────────────────────────────────────
function LangSwitcher({ lang, setLang }) {
  return (
    <nav aria-label="Language selection">
      <div className="lang-switcher">
        {LANG_OPTIONS.map(l => (
          <button
            key={l.code}
            className={`lang-btn ${lang === l.code ? "active" : ""}`}
            onClick={() => setLang(l.code)}
            aria-pressed={lang === l.code}
            aria-label={`${l.full}${lang === l.code ? " (current)" : ""}`}
          >{l.label}</button>
        ))}
      </div>
    </nav>
  );
}

// ─── AppHeader ────────────────────────────────────────────────────────────
function AppHeader({ t }) {
  return (
    <header>
      <div className="header">
        <p className="header-eyebrow">{t.appEyebrow}</p>
        <h1>{t.appTitle1}<span>{t.appTitleAccent}</span>{t.appTitle2}</h1>
        <p className="header-tagline">{t.appTagline}</p>
      </div>
    </header>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────
function ProgressBar({ t, stepIdx }) {
  const steps = [t.stepProfile, t.stepFilters, t.stepScore];
  return (
    <nav aria-label={`${t.progressLabel} ${stepIdx + 1} ${t.stepOf} ${steps.length}`}>
      <div className="progress-bar" role="progressbar" aria-valuenow={stepIdx + 1} aria-valuemin={1} aria-valuemax={steps.length}>
        {steps.map((_, i) => (
          <div key={i} className={`progress-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`} aria-hidden="true" />
        ))}
        <span className="progress-label" aria-hidden="true">{steps[stepIdx]}</span>
      </div>
    </nav>
  );
}

// ─── RegionGate ───────────────────────────────────────────────────────────
function RegionGate({ t, lang, setLang, selectedCountry, setSelectedCountry, onContinue }) {
  return (
    <div className="region-gate">
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <p className="header-eyebrow">{t.appEyebrow}</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          {t.appTitle1}<span style={{ color: "var(--accent)" }}>{t.appTitleAccent}</span>{t.appTitle2}
        </h1>
      </div>
      <LangSwitcher lang={lang} setLang={setLang} />
      <div className="card" role="region" aria-labelledby="region-title">
        <h2 className="card-title" id="region-title">{t.regionTitle}</h2>
        <p className="card-subtitle">{t.regionSubtitle}</p>
        <div role="group" aria-label={t.regionTitle}>
          {NA_COUNTRIES.map(c => (
            <button key={c.code} className="country-option" aria-pressed={selectedCountry === c.code} onClick={() => setSelectedCountry(c.code)}>
              <span aria-hidden="true" style={{ fontSize: 20 }}>{c.flag}</span>
              <span>{t.countries[c.code]}</span>
            </button>
          ))}
        </div>
        <div className="btn-actions" style={{ marginTop: 16 }}>
<button className="btn btn-primary" disabled={!selectedCountry} aria-disabled={!selectedCountry} onClick={onContinue} style={{ width: "100%" }}>
{t.regionContinue}
</button>
</div>
<p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
  <a href={ENDPOINTS.privacy} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)" }}>Privacy Policy</a>
</p>
</div>
</div>
  );
}

// ─── TagInput ─────────────────────────────────────────────────────────────
function TagInput({ labelText, labelId, placeholder, tags, onAddTag, onRemoveTag, removeLabel, hint }) {
  const [inputVal, setInputVal] = useState("");
  const inputId = useId();

  function commit() {
    const v = inputVal.trim();
    if (v) { onAddTag(v); setInputVal(""); }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
  }

  return (
    <div className="field">
      <label id={labelId} htmlFor={inputId}>{labelText}</label>
      <p className="hint">{hint}</p>
      <input
        id={inputId}
        aria-labelledby={labelId}
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={placeholder}
      />
      <div className="tags" role="list" aria-label={labelText}>
        {tags.map((tag, i) => (
          <span key={i} className="tag" role="listitem">
            {tag}
            <button className="tag-remove" onClick={() => onRemoveTag(i)} aria-label={`${removeLabel} ${tag}`}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── OnboardStep ──────────────────────────────────────────────────────────
function OnboardStep({ t, profile, setProfile, onNext }) {
  const nameId = useId(); const titleId = useId(); const bgId = useId();
  const goalId = useId(); const compMinId = useId(); const compTargetId = useId();
  const constraintsId = useId(); const thresholdId = useId();

  const up = useCallback((patch) => setProfile(p => ({ ...p, ...patch })), [setProfile]);

  const addTag = useCallback((field) => (value) => {
    const clean = sanitizeText(value);
    if (clean) up({ [field]: [...(profile[field] || []), clean] });
  }, [profile, up]);

  const removeTag = useCallback((field) => (i) => {
    up({ [field]: profile[field].filter((_, idx) => idx !== i) });
  }, [profile, up]);

  const valid = profile.name && profile.background && profile.careerGoal;

  return (
    <section aria-labelledby="profile-heading">
      <div className="card">
        <h2 className="card-title" id="profile-heading">{t.profileTitle}</h2>
        <p className="card-subtitle">{t.profileSubtitle}</p>
        <div className="field-row">
          <div className="field">
            <label htmlFor={nameId}>{t.labelName}</label>
            <input id={nameId} value={profile.name} onChange={e => up({ name: e.target.value })} placeholder={t.placeholderName} autoComplete="given-name" maxLength={MAX_SHORT} aria-required="true" aria-invalid={!profile.name} />
          </div>
          <div className="field">
            <label htmlFor={titleId}>{t.labelCurrentTitle}</label>
            <input id={titleId} value={profile.currentTitle} onChange={e => up({ currentTitle: e.target.value })} placeholder={t.placeholderTitle} maxLength={MAX_SHORT} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={bgId}>{t.labelBackground}</label>
          <textarea id={bgId} value={profile.background} onChange={e => up({ background: e.target.value })} placeholder={t.placeholderBackground} style={{ minHeight: 120 }} maxLength={MAX_LONG} aria-required="true" aria-invalid={!profile.background} />
        </div>
        <div className="field">
          <label htmlFor={goalId}>{t.labelCareerGoal}</label>
          <input id={goalId} value={profile.careerGoal} onChange={e => up({ careerGoal: e.target.value })} placeholder={t.placeholderGoal} maxLength={MAX_SHORT} aria-required="true" aria-invalid={!profile.careerGoal} />
        </div>

        <TagInput labelText={t.labelTargetRoles} labelId="roles-label" placeholder={t.placeholderRoles} tags={profile.targetRoles} onAddTag={addTag("targetRoles")} onRemoveTag={removeTag("targetRoles")} removeLabel={t.removeTagLabel} hint={t.addTagHint} />
        <TagInput labelText={t.labelTargetIndustries} labelId="industries-label" placeholder={t.placeholderIndustries} tags={profile.targetIndustries} onAddTag={addTag("targetIndustries")} onRemoveTag={removeTag("targetIndustries")} removeLabel={t.removeTagLabel} hint={t.addTagHint} />

        <div className="field-row">
          <div className="field">
            <label htmlFor={compMinId}>{t.labelCompMin}</label>
            <input id={compMinId} type="number" inputMode="numeric" value={profile.compensationMin} onChange={e => up({ compensationMin: e.target.value })} placeholder={t.placeholderCompMin} min="0" max="10000000" />
          </div>
          <div className="field">
            <label htmlFor={compTargetId}>{t.labelCompTarget}</label>
            <input id={compTargetId} type="number" inputMode="numeric" value={profile.compensationTarget} onChange={e => up({ compensationTarget: e.target.value })} placeholder={t.placeholderCompTarget} min="0" max="10000000" />
          </div>
        </div>

        <TagInput labelText={t.labelLocations} labelId="locations-label" placeholder={t.placeholderLocations} tags={profile.locationPrefs} onAddTag={addTag("locationPrefs")} onRemoveTag={removeTag("locationPrefs")} removeLabel={t.removeTagLabel} hint={t.addTagHint} />

        <div className="field">
          <label htmlFor={constraintsId}>{t.labelConstraints}</label>
          <input id={constraintsId} value={profile.hardConstraints} onChange={e => up({ hardConstraints: e.target.value })} placeholder={t.placeholderConstraints} maxLength={MAX_LONG} />
        </div>
        <div className="field">
          <label htmlFor={thresholdId}>{t.labelThreshold}</label>
          <select id={thresholdId} value={profile.threshold} onChange={e => up({ threshold: parseFloat(e.target.value) })}>
            {t.thresholdOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="btn-actions">
          <button className="btn btn-primary" onClick={onNext} disabled={!valid} aria-disabled={!valid}>{t.btnBuildFramework}</button>
        </div>
      </div>
    </section>
  );
}

// ─── FiltersStep ──────────────────────────────────────────────────────────
function FiltersStep({ t, lang, filters, setFilters, onBack, onNext }) {
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const newNameId = useId(); const newDescId = useId();

  const fn = (field) => resolveLang(field, lang);
  const suggested = t.filterSuggestions.filter(s => !filters.some(f => fn(f.name) === s.name));

  function updateWeight(id, weight) {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, weight } : f));
  }
  function removeFilter(id) {
    setFilters(prev => prev.filter(f => f.id !== id));
  }
  function addSuggested(s) {
    setFilters(prev => [...prev, { name: s.name, description: s.description, id: `custom_${Date.now()}`, weight: 1.0, isCore: false }]);
  }
  function addCustom() {
    if (!newName.trim()) return;
    setFilters(prev => [...prev, { name: newName.trim(), description: newDesc.trim(), id: `custom_${Date.now()}`, weight: 1.0, isCore: false }]);
    setNewName(""); setNewDesc("");
  }

  return (
    <section aria-labelledby="filters-heading">
      <div className="card">
        <h2 className="card-title" id="filters-heading">{t.filtersTitle}</h2>
        <p className="card-subtitle">{t.filtersSubtitle}</p>

        <div className="section-label" aria-hidden="true">{t.coreFilters}</div>
        <div role="list" aria-label={t.coreFilters}>
          {filters.filter(f => f.isCore).map(f => (
            <div key={f.id} className="custom-filter-row" role="listitem">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{fn(f.name)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{fn(f.description)}</div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>{t.labelWeight}</label>
                <select className="weight-select" value={f.weight} aria-label={`${t.labelWeight}: ${fn(f.name)}`} onChange={e => updateWeight(f.id, parseFloat(e.target.value))}>
                  {WEIGHT_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        {filters.filter(f => !f.isCore).length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 24 }} aria-hidden="true">{t.customFilters}</div>
            <div role="list" aria-label={t.customFilters}>
              {filters.filter(f => !f.isCore).map(f => (
                <div key={f.id} className="custom-filter-row" role="listitem">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{fn(f.name)}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{fn(f.description)}</div>
                  </div>
                  <select className="weight-select" value={f.weight} aria-label={`${t.labelWeight}: ${fn(f.name)}`} onChange={e => updateWeight(f.id, parseFloat(e.target.value))}>
                    {WEIGHT_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                  <button className="filter-delete-btn" onClick={() => removeFilter(f.id)} aria-label={`Remove ${fn(f.name)}`}>×</button>
                </div>
              ))}
            </div>
          </>
        )}

        {suggested.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="section-label" aria-hidden="true">{t.suggestedFilters}</div>
            <div className="tags" style={{ marginBottom: 16 }}>
              {suggested.map(s => (
                <button key={s.name} className="btn btn-secondary btn-sm" onClick={() => addSuggested(s)}>+ {s.name}</button>
              ))}
            </div>
          </div>
        )}

        <div className="section-label" style={{ marginTop: 24 }} aria-hidden="true">{t.addCustomFilter}</div>
        <div className="field">
          <label htmlFor={newNameId}>{t.labelFilterName}</label>
          <input id={newNameId} value={newName} onChange={e => setNewName(e.target.value)} maxLength={MAX_SHORT} />
        </div>
        <div className="field">
          <label htmlFor={newDescId}>{t.labelFilterDesc}</label>
          <textarea id={newDescId} value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ minHeight: 70 }} maxLength={MAX_LONG} />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={addCustom} disabled={!newName.trim()}>{t.btnAddFilter}</button>

        <div className="btn-actions">
          <button className="btn btn-secondary" onClick={onBack}>{t.btnBack}</button>
          <button className="btn btn-primary" onClick={onNext}>{t.btnStartScoring}</button>
        </div>
      </div>
    </section>
  );
}

// ─── JDInput — isolated so its textarea never loses focus ─────────────────
function JDInput({ t, onScore, loading, error }) {
  const [jd, setJd] = useState("");
  const [tabMode, setTabMode] = useState("paste");
  const [urlVal, setUrlVal] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const jdId = useId(); const urlId = useId();

  async function handleUrlFetch() {
    const safeUrl = sanitizeUrl(urlVal);
    if (!safeUrl) { setFetchError(t.urlFetchError); return; }
    setFetching(true); setFetchError("");
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(safeUrl)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.contents) throw new Error();
      const stripped = data.contents
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
      if (stripped.length < 100) throw new Error();
      setJd(stripped); setTabMode("paste");
    } catch { setFetchError(t.urlFetchError); }
    finally { setFetching(false); }
  }

  return (
    <div className="card">
      <h2 className="card-title">{t.submitTitle}</h2>
      <p className="card-subtitle">{t.submitSubtitle}</p>
      <div role="tablist" className="tabs">
        <button role="tab" className="tab-btn" aria-selected={tabMode === "paste"} aria-controls="panel-paste" id="tab-paste" onClick={() => setTabMode("paste")}>{t.tabPaste}</button>
      </div>
      {tabMode === "paste" ? (
        <div role="tabpanel" id="panel-paste" aria-labelledby="tab-paste">
          <div className="field">
            <label htmlFor={jdId}>{t.labelJD}</label>
            <textarea id={jdId} value={jd} onChange={e => setJd(e.target.value)} placeholder={t.placeholderJD} style={{ minHeight: 200 }} maxLength={MAX_JD} />
          </div>
        </div>
      ) : (
        <div role="tabpanel" id="panel-url" aria-labelledby="tab-url">
          <div className="field">
            <label htmlFor={urlId}>{t.labelUrl}</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input id={urlId} type="url" value={urlVal} onChange={e => setUrlVal(e.target.value)} placeholder="https://" style={{ flex: 1 }} maxLength={MAX_URL} />
              <button className="btn btn-secondary" onClick={handleUrlFetch} disabled={!urlVal.trim() || fetching} aria-busy={fetching}>{fetching ? t.btnFetching : t.btnFetch}</button>
            </div>
            {fetchError && <div role="alert" className="alert alert-warn" style={{ marginTop: 12 }}>{fetchError}</div>}
            <p className="url-note">{t.urlNote}</p>
            {jd && tabMode === "url" && <p style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }} aria-live="polite">✓ {jd.length.toLocaleString()} {t.fetchedText}</p>}
          </div>
        </div>
      )}
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      <div className="btn-actions">
        <button className="btn btn-primary" onClick={() => onScore(jd)} disabled={!jd.trim() || loading} aria-busy={loading}>
          {loading ? t.btnScoring : t.btnScore}
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────
function Dashboard({ t, profile, filters, lang, opportunities, loading, error, onScore, onViewOpp, onEditFilters }) {
  const fn = (field) => resolveLang(field, lang);

  return (
    <main id="main-content" aria-label={t.submitTitle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          {profile.name && <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700 }}>{profile.name}</div>}
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            {filters.length} {t.dashboardSubtitle} {profile.threshold} · {opportunities.length} {t.dashboardScored}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onEditFilters}>{t.editFilters}</button>
      </div>

      {loading ? (
        <div className="loading-wrap" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p className="loading-text">{t.loadingMsg}</p>
        </div>
      ) : (
        <JDInput t={t} onScore={onScore} loading={loading} error={error} />
      )}

      {opportunities.length > 0 && (
        <section aria-labelledby="prev-heading" style={{ marginTop: 32 }}>
          <div className="section-label" aria-hidden="true">{t.prevScored}</div>
          <h2 style={{ display: "none" }} id="prev-heading">{t.prevScored}</h2>
          <p className="threshold-label">{t.threshold}: {profile.threshold}</p>
          <div role="list">
            {[...opportunities].sort((a, b) => b.overall_score - a.overall_score).map(opp => (
              <button key={opp.id} className="opp-card" role="listitem" onClick={() => onViewOpp(opp)}
                aria-label={`${opp.role_title} at ${opp.company}. Score ${opp.overall_score.toFixed(1)} out of 5. Recommendation: ${opp.recommendation}.`}>
                <div className="opp-card-left">
                  <div className="opp-title">{opp.role_title}</div>
                  <div className="opp-company">{opp.company}</div>
                </div>
<div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 1, minWidth: 0 }}>
                  <span className={`score-badge ${opp.overall_score >= 4 ? "score-high" : opp.overall_score >= profile.threshold ? "score-mid" : "score-low"}`} aria-hidden="true">{opp.overall_score.toFixed(1)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
      {opportunities.length === 0 && !loading && (
        <div className="empty-state" aria-live="polite">
          <div aria-hidden="true" className="empty-state-icon">◎</div>
          <p>{t.emptyState}</p>
        </div>
      )}
    </main>
  );
}

// ─── ResultView ───────────────────────────────────────────────────────────
function ResultView({ t, opp, profile, onBack, onRemove }) {
  if (!opp) return null;
  const sc = opp.overall_score >= 4 ? "high" : opp.overall_score >= profile.threshold ? "mid" : "low";

  return (
    <main id="main-content" aria-label={opp.role_title}>
      <button className="back-link" onClick={onBack}>{t.backDash}</button>
      <article aria-labelledby="result-title">
        <div className="card">
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{opp.company}</p>
          <h1 className="card-title" id="result-title" style={{ fontSize: 26 }}>{opp.role_title}</h1>
          <div className="overall-score-display">
            <div className={`big-score ${sc}`} aria-label={`${t.weightedScore}: ${opp.overall_score.toFixed(1)}`}>{opp.overall_score.toFixed(1)}</div>
            <div className="score-meta">
              <p className="score-meta-label">{t.weightedScore}</p>
              <span className={`recommendation-badge rec-${opp.recommendation}`}>{t[opp.recommendation] || opp.recommendation}</span>
              <p className="threshold-note">{t.threshold}: {profile.threshold} — {opp.overall_score >= profile.threshold ? t.aboveThreshold : t.belowThreshold}</p>
            </div>
          </div>
          <div className="narrative-box" role="note"><strong>{t.recRationale}</strong>{opp.recommendation_rationale}</div>
          <div className="narrative-box" style={{ borderLeftColor: "var(--gold)" }} role="note"><strong>{t.honestFit}</strong>{opp.honest_fit_summary}</div>
        </div>

        <div className="fit-grid">
          <section className="fit-box fit-strength" aria-labelledby="str-heading">
            <h2 id="str-heading"><strong>{t.strengths}</strong></h2>
            <ul>{(opp.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
          <section className="fit-box fit-gap" aria-labelledby="gap-heading">
            <h2 id="gap-heading"><strong>{t.gaps}</strong></h2>
            <ul>{(opp.gaps || []).map((g, i) => <li key={i}>{g}</li>)}</ul>
          </section>
        </div>

        <section className="card" aria-labelledby="filter-bd-heading">
          <h2 id="filter-bd-heading" className="section-label">{t.filterBreakdown}</h2>
          {opp.filter_scores.map(fs => {
            const filled = Math.round(fs.score);
            const col = fs.score >= 4 ? "var(--success)" : fs.score >= 3 ? "var(--gold)" : "var(--accent)";
            return (
              <div key={fs.filter_id} className="filter-row">
                <div className="filter-header">
                  <span className="filter-name" id={`fn-${fs.filter_id}`}>{fs.filter_name}</span>
                  <div className="filter-score-dots" aria-hidden="true">
                    {[1,2,3,4,5].map(n => <div key={n} className={`dot ${n <= filled ? (fs.score >= 4 ? "gold" : "filled") : ""}`} />)}
                  </div>
                  <span className="filter-score-num" style={{ color: col }} aria-label={`${t.scoreLabel}: ${fs.score} ${t.outOf}`}>{fs.score}/5</span>
                  {fs.weight && fs.weight !== 1.0 && (
                    <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace" }}>
                      {WEIGHT_OPTIONS.find(w => w.value === fs.weight)?.label || `${fs.weight}×`}
                    </span>
                  )}
                </div>
                <div className="score-bar-wrap" role="progressbar" aria-valuenow={fs.score} aria-valuemin={1} aria-valuemax={5} aria-labelledby={`fn-${fs.filter_id}`}>
                  <div className="score-bar-fill" style={{ width: `${(fs.score / 5) * 100}%`, background: col }} />
                </div>
                <p className="filter-rationale">{fs.rationale}</p>
              </div>
            );
          })}
        </section>

        {opp.narrative_bridge && (
          <section className="card" aria-labelledby="bridge-heading">
            <h2 id="bridge-heading" className="card-title" style={{ fontSize: 16 }}>{t.narrativeBridge}</h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>{opp.narrative_bridge}</p>
          </section>
        )}

        <div className="btn-actions" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-secondary" onClick={onBack}>{t.backDash}</button>
          <button className="btn btn-danger btn-sm" onClick={onRemove}>{t.removeOpp}</button>
        </div>
      </article>
    </main>
  );
}


// ─── SignInGate ───────────────────────────────────────────────────────────
function SignInGate({ t, lang, setLang, onSignIn, authLoading, authError }) {
  return (
    <div className="region-gate">
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <p className="header-eyebrow">AI-Powered Opportunity Intelligence</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          <span style={{ color: "var(--accent)" }}>Vetted</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
          Filter The Noise. Score every role against what you actually care about.
        </p>
      </div>
      <LangSwitcher lang={lang} setLang={setLang} />
      <div className="card" style={{ textAlign: "center" }}>
        <h2 className="card-title" style={{ marginBottom: 8 }}>Welcome</h2>
        <p className="card-subtitle">Sign in to access your personalized career intelligence framework.</p>

        {authError && (
          <div role="alert" className="alert alert-error" style={{ marginBottom: 16, textAlign: "left" }}>{authError}</div>
        )}

        <button
          className="btn btn-primary"
          onClick={onSignIn}
          disabled={authLoading}
          aria-busy={authLoading}
          style={{ width: "100%", marginBottom: 16, minHeight: 50, fontSize: 16, gap: 10 }}
        >
          {authLoading ? (
            <>
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Sign in with Apple
            </>
          )}
        </button>

        <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
          Your data is private and never sold.{" "}
          <a href={ENDPOINTS.privacy} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// APP — only manages routing state; all components are stable references
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [lang, setLang] = useState("en");
  const [step, setStep] = useState("region");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [profile, setProfile] = useState({
    name: "", currentTitle: "", background: "", targetRoles: [], targetIndustries: [],
    compensationMin: "", compensationTarget: "", locationPrefs: [], hardConstraints: "",
    careerGoal: "", threshold: 3.5,
  });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [opportunities, setOpportunities] = useState([]);
  const [currentOpp, setCurrentOpp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const announcerRef = useRef(null);

  const t = T[lang];
  const dir = t.dir;

  // Inject styles
  useEffect(() => {
    let el = document.getElementById("opp-styles");
    if (!el) { el = document.createElement("style"); el.id = "opp-styles"; document.head.appendChild(el); }
    el.textContent = buildCss(dir);
    document.documentElement.lang = t.lang;
    document.documentElement.dir = dir;
  }, [dir, lang, t.lang]);

  // Restore auth from localStorage on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = localStorage.getItem("vetted_user");
        if (stored) {
          const user = JSON.parse(stored);
          if (user?.id) {
            setAuthUser(user);
            const result = await fetch(ENDPOINTS.supabase, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Vetted-Token": import.meta.env.VITE_VETTED_SECRET || "" },
              body: JSON.stringify({ action: "load", appleId: user.id })
            });
            if (result.ok) {
              const data = await result.json();
              const saved = data.data;
              if (saved?.profile?.display_name && saved.profile.display_name !== "User") {
                const updatedUser = { ...user, displayName: saved.profile.display_name };
                localStorage.setItem("vetted_user", JSON.stringify(updatedUser));
                setAuthUser(updatedUser);
              }
              if (saved?.profile) {
                const p = saved.profile;
                setProfile(prev => ({ ...prev,
                  name: p.name || prev.name,
                  background: p.background || prev.background,
                  careerGoal: p.career_goal || prev.careerGoal,
                  currentTitle: p.current_title || prev.currentTitle,
                  targetRoles: p.target_roles || prev.targetRoles,
                  targetIndustries: p.target_industries || prev.targetIndustries,
                  location: p.location || prev.location,
                  compMin: p.comp_min || prev.compMin,
                  compMax: p.comp_max || prev.compMax,
                  threshold: p.threshold || prev.threshold,
                }));
              }
              if (saved?.filters?.length) {
                setFilters(saved.filters.map(f => ({ id: f.filter_id, name: f.filter_name, weight: f.weight, enabled: f.enabled })));
              }
              if (saved?.opportunities?.length) {
                setOpportunities(saved.opportunities);
              }
              if (saved?.profile) setStep("dashboard");
            }
          }
        }
      } catch { /* ignore */ }
    }
    restoreSession();
  }, []);

  function announce(msg) {
    if (announcerRef.current) announcerRef.current.textContent = "";
    setTimeout(() => { if (announcerRef.current) announcerRef.current.textContent = msg; }, 50);
  }

  const fn = useCallback((field) => resolveLang(field, lang), [lang]);

  // ── Supabase helper ───────────────────────────────────────────────────────
  async function dbCall(action, payload) {
    const secret = import.meta.env.VITE_VETTED_SECRET || "";
    const res = await fetch(ENDPOINTS.supabase, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Vetted-Token": secret },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`DB error ${res.status}`);
    return res.json();
  }

  // ── Load user data from Supabase after sign-in ────────────────────────────
  async function loadUserData(appleId) {
    try {
      const result = await dbCall("load", { action: "load", appleId });
      const { profile: savedProfile, filters: savedFilters, opportunities: savedOpps } = result.data;

      if (savedProfile) {
        setProfile({
          name: savedProfile.display_name || "",
          currentTitle: savedProfile.current_title || "",
          background: savedProfile.background || "",
          careerGoal: savedProfile.career_goal || "",
          targetRoles: savedProfile.target_roles || [],
          targetIndustries: savedProfile.target_industries || [],
          compensationMin: savedProfile.compensation_min?.toString() || "",
          compensationTarget: savedProfile.compensation_target?.toString() || "",
          locationPrefs: savedProfile.location_prefs || [],
          hardConstraints: savedProfile.hard_constraints || "",
          threshold: savedProfile.threshold || 3.5,
        });
        if (savedProfile.lang) setLang(savedProfile.lang);
      }

      if (savedFilters?.length) {
        setFilters(savedFilters.map(f => ({
          id: f.filter_id,
          name: f.name,
          description: f.description,
          weight: f.weight,
          isCore: f.is_core,
        })));
      }

      if (savedOpps?.length) {
        setOpportunities(savedOpps.map(o => ({
          ...o,
          filter_scores: o.filter_scores || [],
          strengths: o.strengths || [],
          gaps: o.gaps || [],
        })));
        setStep("dashboard");
      } else if (savedProfile) {
        setStep("dashboard");
      }

    } catch (err) {
      console.error("Failed to load user data:", err.message);
      Sentry.captureException(err, { tags: { location: "load_user_data" } });
      // Non-fatal — user can still use the app, data just won't persist
    }
  }

  // ── Sign in with Apple ───────────────────────────────────────────────────
  async function handleSignInWithApple() {
    if (authLoading) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      // Use native Swift plugin if available (native iOS), else fallback message
      if (window.Capacitor?.isNativePlatform?.()) {
        const result = await window.Capacitor.Plugins.SignInWithApplePlugin.authorize();

        if (result.error) throw new Error(result.message || "Sign in failed");
        const { identityToken, givenName, familyName } = result.response;

        // Verify token server-side
        const res = await fetch(ENDPOINTS.appleAuth, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identityToken,
            fullName: { givenName, familyName },
          }),
        });

        if (!res.ok) throw new Error("Server verification failed");
        const data = await res.json();

        const resolvedName = givenName || data.user.displayName || "";
        const user = {
          id: data.user.id,
          email: data.user.email,
          displayName: resolvedName || "User",
        };

        localStorage.setItem("vetted_user", JSON.stringify(user));
        setAuthUser(user);

        // Load all saved data from Supabase
        await loadUserData(user.id);

        if (resolvedName) {
          setProfile(p => ({ ...p, name: p.name || resolvedName }));
          const updatedUser = { ...user, displayName: resolvedName };
          localStorage.setItem("vetted_user", JSON.stringify(updatedUser));
          setAuthUser(updatedUser);
        }

      } else {
        // Web preview — show helpful message instead of failing silently
        setAuthError("Sign in with Apple requires the iOS app. To test on web, use the Netlify preview with a supported browser on a Mac or iPhone.");
      }
    } catch (err) {
      console.error("Apple sign in error:", err?.message || err);
      Sentry.captureException(err, { tags: { location: "apple_sign_in" } });
      if (err?.message?.includes("cancelled") || err?.message?.includes("canceled")) {
        setAuthError("Sign in was cancelled.");
      } else {
        setAuthError("Sign in failed. Please try again.");
      }
    } finally {
      setAuthLoading(false);
    }
  }

  function handleSignOut() {
    setAuthError("");
    localStorage.removeItem("vetted_user");
    setAuthUser(null);
    setStep("region");
    setOpportunities([]);
    setProfile({
      name: "", currentTitle: "", background: "", targetRoles: [], targetIndustries: [],
      compensationMin: "", compensationTarget: "", locationPrefs: [], hardConstraints: "",
      careerGoal: "", threshold: 3.5,
    });
    setFilters(DEFAULT_FILTERS);
  }

  // ── Scoring ──────────────────────────────────────────────────────────────
  async function scoreOpportunity(jd) {
    if (!checkRateLimit()) {
      setError("Too many requests. Please wait before scoring again.");
      return;
    }

    // ── Tier gating check ────────────────────────────────────────────────
    if (authUser) {
      const limitCheck = await dbCall("checkScoreLimit", { action: "checkScoreLimit", appleId: authUser.id });
      if (!limitCheck?.allowed) {
        setError("You've reached your 10 free scores this month. Upgrade to Signal or Vantage for unlimited scoring.");
        setLoading(false);
        return;
      }
    }

    setLoading(true); setError("");
    announce(t.loadingMsg);

    const safeProfile = {
      name: sanitizeText(profile.name), currentTitle: sanitizeText(profile.currentTitle),
      background: sanitizeText(profile.background, MAX_LONG), careerGoal: sanitizeText(profile.careerGoal),
      targetRoles: profile.targetRoles.map(r => sanitizeText(r)).join(", "),
      targetIndustries: profile.targetIndustries.map(i => sanitizeText(i)).join(", "),
      comp: `$${sanitizeText(profile.compensationMin)}–$${sanitizeText(profile.compensationTarget)}`,
      locations: profile.locationPrefs.map(l => sanitizeText(l)).join(", "),
      constraints: sanitizeText(profile.hardConstraints, MAX_LONG), threshold: profile.threshold,
    };
    const filterDefs = filters.map(f => `- ${sanitizeText(fn(f.name))} (weight: ${f.weight}×): ${sanitizeText(fn(f.description), MAX_LONG)}`).join("\n");
    const safeJd = sanitizeText(jd, MAX_JD);
    const profileSummary = Object.entries(safeProfile).map(([k, v]) => `${k}: ${v}`).join("\n");
    const prompt = `You are an expert executive career coach. Score this opportunity against the candidate's filter framework. Respond in ${t.lang} language for all text fields except the recommendation field. The recommendation field must always be in English: use "pursue" if overall_score >= ${profile.threshold}, use "monitor" if overall_score >= ${profile.threshold - 0.5} but below threshold, use "pass" if overall_score < ${profile.threshold - 0.5}.\n\nCANDIDATE PROFILE:\n${profileSummary}\n\nSCORING FRAMEWORK (score each 1–5):\n${filterDefs}\n\nJOB DESCRIPTION:\n${safeJd}\n\nRespond ONLY with valid JSON (no markdown) in exactly this shape:\n{"role_title":"","company":"","overall_score":3.8,"recommendation":"pursue","recommendation_rationale":"","filter_scores":[{"filter_id":"","filter_name":"","score":4,"rationale":""}],"strengths":[""],"gaps":[""],"narrative_bridge":"","honest_fit_summary":""}`;

    try {
      const response = await fetch(ENDPOINTS.anthropic, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Vetted-Token": import.meta.env.VITE_VETTED_SECRET || "" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      const text = data.content?.map(b => (typeof b.text === "string" ? b.text : "")).join("") || "";
      const raw = JSON.parse(text.replace(/```json|```/g, "").trim());
      const VALID_RECS = ["pursue", "pass", "monitor"];
      const result = {
        role_title: sanitizeText(String(raw.role_title || "Unknown Role")),
        company: sanitizeText(String(raw.company || "Unknown Company")),
        overall_score: Math.min(5, Math.max(1, Number(raw.overall_score) || 1)),
        recommendation: VALID_RECS.includes(raw.recommendation) ? raw.recommendation : "monitor",
        recommendation_rationale: sanitizeText(String(raw.recommendation_rationale || ""), MAX_LONG),
        filter_scores: Array.isArray(raw.filter_scores) ? raw.filter_scores.map(fs => ({
          filter_id: sanitizeText(String(fs.filter_id || "")),
          filter_name: sanitizeText(String(fs.filter_name || "")),
          score: Math.min(5, Math.max(1, Number(fs.score) || 1)),
          rationale: sanitizeText(String(fs.rationale || ""), MAX_LONG),
          weight: filters.find(f => f.id === fs.filter_id)?.weight || 1.0,
        })) : [],
        strengths: Array.isArray(raw.strengths) ? raw.strengths.map(s => sanitizeText(String(s))) : [],
        gaps: Array.isArray(raw.gaps) ? raw.gaps.map(g => sanitizeText(String(g))) : [],
        narrative_bridge: sanitizeText(String(raw.narrative_bridge || ""), MAX_LONG),
        honest_fit_summary: sanitizeText(String(raw.honest_fit_summary || ""), MAX_LONG),
      };
      const enriched = { ...result, id: Date.now(), jd: safeJd };
      setOpportunities(prev => [enriched, ...prev]);
      setCurrentOpp(enriched);
      setStep("result");

      // ── Increment score count for tier gating ──────────────────────────
      if (authUser) {
        dbCall("incrementScoreCount", { action: "incrementScoreCount", appleId: authUser.id })
          .catch(err => console.error("Failed to increment score count:", err.message));
      }

      // Persist to Supabase
      if (authUser?.id) {
        dbCall("saveOpportunity", { action: "saveOpportunity", appleId: authUser.id, opportunity: enriched })
          .catch(err => console.error("Failed to save opportunity:", err.message));
      }
      announce(`Scored: ${result.role_title}. Score: ${result.overall_score.toFixed(1)}. Recommendation: ${result.recommendation}.`);
    } catch (err) {
      const detail = err?.message ? ` (${err.message})` : "";
      setError(`${t.scoringError}${detail}`);
      announce(t.scoringError);
    } finally {
      setLoading(false);
    }
  }

  const stepIdx = { region: -1, onboard: 0, filters: 1, dashboard: 2, result: 2 }[step] ?? 0;

  // ── Auth gate — show sign in screen if not authenticated ─────────────────
  if (!authUser) {
    return (
      <>
        <div ref={announcerRef} role="status" aria-live="polite" aria-atomic="true"
          style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }} />
        <div className="app">
          <SignInGate
            t={t}
            lang={lang}
            setLang={setLang}
            onSignIn={handleSignInWithApple}
            authLoading={authLoading}
            authError={authError}
          />
        </div>
      </>
    );
  }

  if (loading && step === "dashboard") {
    return (
      <div className="app">
        <div className="loading-wrap" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p className="loading-text">{t.loadingMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div ref={announcerRef} role="status" aria-live="polite" aria-atomic="true"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }} />

      <div className="app">
        {step !== "region" && <LangSwitcher lang={lang} setLang={setLang} />}
        {step !== "region" && <AppHeader t={t} />}
        {step !== "region" && step !== "result" && <ProgressBar t={t} stepIdx={stepIdx} />}

        {/* Signed-in user bar */}
        {step !== "region" && authUser && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 8, marginTop: -24 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
              {authUser.displayName || authUser.email || "Signed in"}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={handleSignOut} style={{ fontSize: 11, padding: "4px 12px", minHeight: 30 }}>
              Sign Out
            </button>
          </div>
        )}

        {step === "region" && (
          <RegionGate t={t} lang={lang} setLang={setLang} selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} onContinue={() => setStep("onboard")} />
        )}
        {step === "onboard" && (
          <OnboardStep t={t} profile={profile} setProfile={setProfile} onNext={() => {
            setStep("filters");
            if (authUser?.id) {
              dbCall("saveProfile", { action: "saveProfile", appleId: authUser.id, profile: { ...profile, lang, displayName: authUser.displayName, email: authUser.email } })
                .catch(err => console.error("Failed to save profile:", err.message));
            }
          }} />
        )}
        {step === "filters" && (
          <FiltersStep t={t} lang={lang} filters={filters} setFilters={setFilters} onBack={() => setStep("onboard")} onNext={() => {
            setStep("dashboard");
            if (authUser?.id) {
              dbCall("saveFilters", { action: "saveFilters", appleId: authUser.id, filters })
                .catch(err => console.error("Failed to save filters:", err.message));
            }
          }} />
        )}
        {step === "dashboard" && (
          <Dashboard t={t} profile={profile} filters={filters} lang={lang} opportunities={opportunities} loading={loading} error={error}
            onScore={scoreOpportunity} onViewOpp={(opp) => { setCurrentOpp(opp); setStep("result"); }} onEditFilters={() => setStep("filters")} />
        )}
        {step === "result" && (
          <ResultView t={t} opp={currentOpp} profile={profile} onBack={() => setStep("dashboard")}
            onRemove={() => {
              setOpportunities(prev => prev.filter(o => o.id !== currentOpp.id));
              setStep("dashboard");
              if (authUser?.id && currentOpp?.id) {
                dbCall("deleteOpportunity", { action: "deleteOpportunity", appleId: authUser.id, opportunityId: currentOpp.id })
                  .catch(err => console.error("Failed to delete opportunity:", err.message));
              }
            }} />
        )}
      </div>
    </>
  );
}
