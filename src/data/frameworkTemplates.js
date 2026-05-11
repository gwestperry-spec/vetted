// ─── Framework templates ────────────────────────────────────────────────────
// Starter weight configurations for senior role types. Lets new users
// skip the "build from scratch" cold start and pick a framework that
// matches their target role, then customize from there.
//
// Each template maps the 5 canonical filter IDs (from DEFAULT_FILTERS in
// App.jsx) to a weight. NO new filter content is created here — only
// weight redistribution. This means zero per-template translation cost
// for the filter descriptions; only the role-type name needs localizing.
//
// Weight range: 1.0 (low importance) to 3.0 (high importance). The
// product's WEIGHT_OPTIONS in WeightPicker.jsx is the source of truth
// for granularity — keep weights aligned to the same options for
// clean UX (1.0, 1.5, 2.0, 2.5, 3.0).

export const FRAMEWORK_TEMPLATES = [
  {
    id: "vp_engineering",
    role_type: {
      en: "VP of Engineering",
      es: "VP de Ingeniería",
      fr: "VP Ingénierie",
      zh: "工程副总裁",
      ar: "نائب رئيس الهندسة",
      vi: "Phó Chủ Tịch Kỹ Thuật",
      pt: "VP de Engenharia",
    },
    blurb: {
      en: "Access to leadership and org-wide scope matter most. Financial accountability is real but secondary to technical scale and architecture decisions.",
      es: "El acceso al liderazgo y el alcance organizacional son lo más importante. La responsabilidad financiera es real pero secundaria.",
      fr: "L'accès à la direction et la portée organisationnelle priment. La responsabilité financière compte mais reste secondaire.",
      zh: "领导层接触和组织范围最为重要。财务责任虽然重要但次于技术规模。",
      ar: "الوصول إلى القيادة والنطاق التنظيمي هما الأهم. المسؤولية المالية حقيقية لكنها ثانوية.",
      vi: "Tiếp cận lãnh đạo và phạm vi tổ chức là quan trọng nhất. Trách nhiệm tài chính có nhưng không phải ưu tiên.",
      pt: "Acesso à liderança e abrangência organizacional importam mais. Responsabilidade financeira é relevante mas secundária.",
    },
    weights: {
      pl_ownership: 1.5,
      reporting_structure: 3.0,
      metric_specificity: 2.5,
      scope_language: 3.0,
      title_gap: 2.0,
    },
  },
  {
    id: "vp_operations",
    role_type: {
      en: "VP of Operations",
      es: "VP de Operaciones",
      fr: "VP des Opérations",
      zh: "运营副总裁",
      ar: "نائب رئيس العمليات",
      vi: "Phó Chủ Tịch Vận Hành",
      pt: "VP de Operações",
    },
    blurb: {
      en: "Financial accountability, metrics, and scope are equally central. Operations roles win or lose on measurable outcomes against named budgets.",
      es: "Responsabilidad financiera, métricas y alcance son centrales. Los roles de operaciones se ganan o pierden por resultados medibles.",
      fr: "Responsabilité financière, métriques et portée sont également essentielles. Les rôles d'opérations se jouent sur des résultats mesurables.",
      zh: "财务责任、指标和范围同等重要。运营职位以可衡量的成果对抗明确的预算来决定胜负。",
      ar: "المسؤولية المالية والمقاييس والنطاق متساوية الأهمية. أدوار العمليات تكسب أو تخسر على نتائج قابلة للقياس.",
      vi: "Trách nhiệm tài chính, chỉ số và phạm vi đều quan trọng như nhau. Vị trí vận hành thắng/thua bằng kết quả đo lường được.",
      pt: "Responsabilidade financeira, métricas e escopo são igualmente centrais. Cargos de operações são definidos por resultados mensuráveis.",
    },
    weights: {
      pl_ownership: 3.0,
      reporting_structure: 2.0,
      metric_specificity: 3.0,
      scope_language: 2.5,
      title_gap: 2.0,
    },
  },
  {
    id: "vp_sales",
    role_type: {
      en: "VP of Sales / CRO",
      es: "VP de Ventas / CRO",
      fr: "VP des Ventes / CRO",
      zh: "销售副总裁 / 首席营收官",
      ar: "نائب رئيس المبيعات / مدير الإيرادات",
      vi: "Phó Chủ Tịch Bán Hàng / CRO",
      pt: "VP de Vendas / CRO",
    },
    blurb: {
      en: "Revenue ownership and crisp success metrics are everything. Title and access still matter; financial accountability is non-negotiable.",
      es: "La propiedad de los ingresos y métricas claras lo son todo. Título y acceso aún importan; la responsabilidad financiera es innegociable.",
      fr: "La propriété du chiffre d'affaires et des métriques nettes sont tout. Le titre et l'accès comptent; la responsabilité financière est non négociable.",
      zh: "收入归属和清晰的成功指标是一切。职位和接触仍然重要；财务责任不可妥协。",
      ar: "ملكية الإيرادات ومقاييس نجاح واضحة هما كل شيء. المسمى والوصول لا يزالان مهمين؛ المسؤولية المالية غير قابلة للتفاوض.",
      vi: "Sở hữu doanh thu và các chỉ số thành công rõ ràng là tất cả. Chức danh và tiếp cận vẫn quan trọng; trách nhiệm tài chính không thể thỏa hiệp.",
      pt: "Posse de receita e métricas claras são tudo. Título e acesso ainda importam; responsabilidade financeira é inegociável.",
    },
    weights: {
      pl_ownership: 3.0,
      reporting_structure: 2.5,
      metric_specificity: 3.0,
      scope_language: 2.0,
      title_gap: 1.5,
    },
  },
  {
    id: "vp_product",
    role_type: {
      en: "VP of Product / CPO",
      es: "VP de Producto / CPO",
      fr: "VP Produit / CPO",
      zh: "产品副总裁 / 首席产品官",
      ar: "نائب رئيس المنتج / مدير المنتج التنفيذي",
      vi: "Phó Chủ Tịch Sản Phẩm / CPO",
      pt: "VP de Produto / CPO",
    },
    blurb: {
      en: "Strategic scope and exec access drive product careers. Metrics matter, but P&L ownership is often shared with go-to-market.",
      es: "El alcance estratégico y el acceso ejecutivo impulsan las carreras de producto. Las métricas importan, pero el P&L se comparte.",
      fr: "La portée stratégique et l'accès exécutif portent les carrières produit. Les métriques comptent mais le P&L est souvent partagé.",
      zh: "战略范围和高管接触推动产品职业生涯。指标很重要，但损益责任通常与上市部门共享。",
      ar: "النطاق الاستراتيجي والوصول التنفيذي يحركان مسيرة المنتج. المقاييس مهمة، لكن مسؤولية الربح والخسارة غالباً ما تكون مشتركة.",
      vi: "Phạm vi chiến lược và tiếp cận điều hành thúc đẩy sự nghiệp sản phẩm. Chỉ số quan trọng, nhưng trách nhiệm P&L thường được chia sẻ.",
      pt: "Escopo estratégico e acesso executivo impulsionam carreiras de produto. Métricas importam, mas P&L é frequentemente compartilhado.",
    },
    weights: {
      pl_ownership: 1.5,
      reporting_structure: 2.5,
      metric_specificity: 2.5,
      scope_language: 3.0,
      title_gap: 2.0,
    },
  },
  {
    id: "vp_marketing",
    role_type: {
      en: "VP of Marketing / CMO",
      es: "VP de Marketing / CMO",
      fr: "VP Marketing / CMO",
      zh: "市场副总裁 / 首席营销官",
      ar: "نائب رئيس التسويق / مدير التسويق التنفيذي",
      vi: "Phó Chủ Tịch Tiếp Thị / CMO",
      pt: "VP de Marketing / CMO",
    },
    blurb: {
      en: "Marketing leaders win on measurable outcomes and broad organizational reach. Budget ownership matters; direct CEO access varies by stage.",
      es: "Los líderes de marketing ganan en resultados medibles y alcance organizacional amplio. La propiedad del presupuesto importa.",
      fr: "Les responsables marketing gagnent sur des résultats mesurables et une portée organisationnelle large.",
      zh: "营销领导者凭借可衡量的成果和广泛的组织覆盖取胜。预算归属重要；直接接触CEO因阶段而异。",
      ar: "قادة التسويق يفوزون بنتائج قابلة للقياس ومدى تنظيمي واسع. ملكية الميزانية مهمة.",
      vi: "Các lãnh đạo tiếp thị thắng bằng kết quả đo lường được và phạm vi tổ chức rộng. Sở hữu ngân sách quan trọng.",
      pt: "Líderes de marketing vencem em resultados mensuráveis e alcance organizacional amplo. Posse de orçamento importa.",
    },
    weights: {
      pl_ownership: 2.0,
      reporting_structure: 2.0,
      metric_specificity: 3.0,
      scope_language: 3.0,
      title_gap: 2.0,
    },
  },
  {
    id: "cfo",
    role_type: {
      en: "CFO / VP Finance",
      es: "CFO / VP de Finanzas",
      fr: "CFO / VP Finance",
      zh: "首席财务官 / 财务副总裁",
      ar: "مدير مالي / نائب رئيس المالية",
      vi: "Giám Đốc Tài Chính / Phó Chủ Tịch Tài Chính",
      pt: "CFO / VP de Finanças",
    },
    blurb: {
      en: "Financial accountability is the role. Direct exec access, sharp metrics, and clear scope are all critical. Title integrity is least important — the work speaks.",
      es: "La responsabilidad financiera es el rol mismo. Acceso ejecutivo, métricas claras y alcance definido son críticos.",
      fr: "La responsabilité financière est le rôle. Accès direct à la direction, métriques nettes et portée claire sont essentiels.",
      zh: "财务责任就是这个职位本身。直接的高管接触、清晰的指标和明确的范围都至关重要。",
      ar: "المسؤولية المالية هي الدور نفسه. الوصول التنفيذي المباشر والمقاييس الحادة والنطاق الواضح كلها حاسمة.",
      vi: "Trách nhiệm tài chính chính là vai trò. Tiếp cận điều hành trực tiếp, chỉ số sắc bén và phạm vi rõ ràng đều quan trọng.",
      pt: "Responsabilidade financeira é o cargo em si. Acesso executivo direto, métricas nítidas e escopo claro são todos críticos.",
    },
    weights: {
      pl_ownership: 3.0,
      reporting_structure: 3.0,
      metric_specificity: 3.0,
      scope_language: 2.0,
      title_gap: 1.5,
    },
  },
  {
    id: "chief_of_staff",
    role_type: {
      en: "Chief of Staff",
      es: "Jefe de Gabinete",
      fr: "Chef de Cabinet",
      zh: "总裁办公室主任 / 幕僚长",
      ar: "كبير الموظفين",
      vi: "Chánh Văn Phòng",
      pt: "Chief of Staff",
    },
    blurb: {
      en: "The role lives or dies on direct CEO access and organization-wide scope. Title is often deliberately ambiguous — integrity matters more than usual.",
      es: "El rol vive o muere por el acceso directo al CEO y el alcance organizacional. El título suele ser deliberadamente ambiguo.",
      fr: "Le rôle dépend entièrement de l'accès direct au PDG et de la portée organisationnelle. Le titre est souvent volontairement flou.",
      zh: "该职位的成败取决于直接接触CEO和组织范围。职位名称常常故意模糊——诚信比平时更重要。",
      ar: "الدور يعتمد كليًا على الوصول المباشر للرئيس التنفيذي والنطاق المؤسسي. المسمى غالبًا غامض عمدًا.",
      vi: "Vai trò sống hoặc chết bởi việc tiếp cận trực tiếp CEO và phạm vi toàn tổ chức. Chức danh thường mơ hồ có chủ đích.",
      pt: "O cargo depende inteiramente de acesso direto ao CEO e abrangência organizacional. Título costuma ser deliberadamente ambíguo.",
    },
    weights: {
      pl_ownership: 1.5,
      reporting_structure: 3.0,
      metric_specificity: 2.0,
      scope_language: 3.0,
      title_gap: 2.5,
    },
  },
  {
    id: "vp_people",
    role_type: {
      en: "VP of People / CPO (HR)",
      es: "VP de Personas / CHRO",
      fr: "VP des Ressources Humaines / CHRO",
      zh: "人力资源副总裁 / 首席人力资源官",
      ar: "نائب رئيس الموارد البشرية",
      vi: "Phó Chủ Tịch Nhân Sự / CHRO",
      pt: "VP de Pessoas / CHRO",
    },
    blurb: {
      en: "Scope and access dominate — People leaders live on cross-functional reach. Direct financial accountability is rarer; metrics often softer than other functions.",
      es: "Alcance y acceso dominan — los líderes de Personas viven del alcance interfuncional. La responsabilidad financiera directa es más rara.",
      fr: "La portée et l'accès dominent — les responsables RH vivent de la portée transversale.",
      zh: "范围和接触占主导——人力资源领导者依赖跨职能影响力。直接财务责任较少；指标常常较软。",
      ar: "النطاق والوصول يهيمنان — قادة الموارد البشرية يعتمدون على الوصول متعدد الوظائف.",
      vi: "Phạm vi và tiếp cận chiếm ưu thế — lãnh đạo nhân sự sống bằng phạm vi liên chức năng. Trách nhiệm tài chính trực tiếp hiếm hơn.",
      pt: "Escopo e acesso dominam — líderes de Pessoas vivem de alcance multifuncional. Responsabilidade financeira direta é mais rara.",
    },
    weights: {
      pl_ownership: 1.5,
      reporting_structure: 2.5,
      metric_specificity: 2.0,
      scope_language: 3.0,
      title_gap: 2.0,
    },
  },
  {
    id: "founder_president",
    role_type: {
      en: "Founder / President",
      es: "Fundador / Presidente",
      fr: "Fondateur / Président",
      zh: "创始人 / 总裁",
      ar: "مؤسس / رئيس",
      vi: "Nhà Sáng Lập / Chủ Tịch",
      pt: "Fundador / Presidente",
    },
    blurb: {
      en: "All five dimensions matter at maximum weight. Founder-tier roles demand full P&L, board access, hard metrics, and broad scope. Compromise on any of them and you've taken a smaller job.",
      es: "Las cinco dimensiones importan al máximo. Los roles de fundador exigen P&L completo, acceso a la junta, métricas duras y alcance amplio.",
      fr: "Les cinq dimensions comptent au maximum. Les rôles de fondateur exigent P&L complet, accès au conseil, métriques solides et large portée.",
      zh: "所有五个维度均以最高权重重要。创始人级别的职位需要完整的损益责任、董事会接触、严格的指标和广泛的范围。",
      ar: "الأبعاد الخمسة كلها مهمة بأقصى وزن. أدوار المؤسس تتطلب مسؤولية كاملة للربح والخسارة ووصول لمجلس الإدارة.",
      vi: "Cả năm khía cạnh đều quan trọng ở mức tối đa. Vai trò sáng lập đòi hỏi toàn bộ P&L, tiếp cận hội đồng, chỉ số khắt khe và phạm vi rộng.",
      pt: "Todas as cinco dimensões importam no peso máximo. Cargos de fundador exigem P&L completo, acesso ao conselho, métricas duras e amplo escopo.",
    },
    weights: {
      pl_ownership: 3.0,
      reporting_structure: 3.0,
      metric_specificity: 2.5,
      scope_language: 3.0,
      title_gap: 2.0,
    },
  },
  {
    id: "director_generic",
    role_type: {
      en: "Director (general senior)",
      es: "Director (senior general)",
      fr: "Directeur (senior général)",
      zh: "总监(高级通用)",
      ar: "مدير (عام كبير)",
      vi: "Giám Đốc (cấp cao chung)",
      pt: "Diretor (sênior geral)",
    },
    blurb: {
      en: "Balanced starting point for director-tier roles where you haven't committed to a single function. Slight financial bias reflects that director-level roles increasingly carry budget ownership.",
      es: "Punto de partida equilibrado para roles de director. Ligero sesgo financiero refleja la propiedad presupuestaria creciente en este nivel.",
      fr: "Point de départ équilibré pour les rôles de directeur. Léger biais financier reflète l'augmentation des responsabilités budgétaires.",
      zh: "总监级职位的均衡起点。轻微的财务倾向反映了总监级别越来越多承担预算责任。",
      ar: "نقطة بداية متوازنة لأدوار المدير. الانحياز المالي البسيط يعكس الملكية المتزايدة للميزانية.",
      vi: "Điểm khởi đầu cân bằng cho vai trò giám đốc. Xu hướng tài chính nhẹ phản ánh trách nhiệm ngân sách ngày càng tăng.",
      pt: "Ponto de partida equilibrado para cargos de diretor. Leve viés financeiro reflete a crescente posse orçamentária neste nível.",
    },
    weights: {
      pl_ownership: 2.5,
      reporting_structure: 2.0,
      metric_specificity: 2.5,
      scope_language: 2.0,
      title_gap: 2.0,
    },
  },
];

// Resolve a localized template field with English fallback.
export function getTemplateField(template, fieldName, lang = "en") {
  const field = template?.[fieldName];
  if (typeof field === "string") return field;
  return field?.[lang] ?? field?.en ?? "";
}
