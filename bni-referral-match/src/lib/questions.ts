export type QuestionType =
  | "checkbox"
  | "checkbox-percent"
  | "radio"
  | "dropdown"
  | "textarea"
  | "scale";

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
  maxLength?: number;
  helper?: string;
}

export interface Section {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  icon: string;
  questions: Question[];
}

export const INDUSTRIES = [
  "保險理財", "房地產", "室內設計", "建築營造", "法律服務", "會計財稅",
  "行銷廣告", "網頁/軟體開發", "醫療健康", "美容美業", "餐飲食品",
  "製造業", "印刷包裝", "教育訓練", "旅遊休閒", "汽車服務",
  "人力資源", "電商零售",
];

export const REGIONS = [
  "台北市", "新北市", "基隆市", "桃園市", "新竹縣市", "苗栗縣",
  "台中市", "彰化縣", "南投縣", "雲林縣", "嘉義縣市", "台南市",
  "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "台東縣", "離島地區",
];

export const RESOURCES = [
  "客戶名單交換", "專業知識／講師", "場地空間", "行銷曝光／社群流量",
  "媒體／採訪管道", "設計／製作產能", "技術開發", "供應商網絡",
  "資金／投資人脈", "政府補助資訊", "異業合作通路", "活動合辦",
];

export const SECTIONS: Section[] = [
  {
    id: "s1",
    num: "一",
    title: "事業現況盤點",
    subtitle: "先看清楚現在的事業樣貌，才能找到最適合的商機切入點。",
    icon: "🧭",
    questions: [
      {
        id: "s1_sources",
        label: "目前主要業務來源（可複選，勾選後請填入大約比例 %）",
        type: "checkbox-percent",
        options: ["BNI", "舊客戶", "網路", "FB", "IG", "Google", "合作夥伴", "展覽", "陌生開發", "其他"],
        helper: "比例加總建議為 100%",
      },
      {
        id: "s1_years",
        label: "公司／事業成立年資",
        type: "radio",
        options: ["未滿 1 年", "1–3 年", "3–5 年", "5–10 年", "10 年以上"],
      },
      {
        id: "s1_team",
        label: "團隊規模",
        type: "dropdown",
        options: ["1 人（個人工作者）", "2–5 人", "6–10 人", "11–30 人", "31–100 人", "100 人以上"],
      },
      {
        id: "s1_revenue_model",
        label: "主要營收型態",
        type: "radio",
        options: ["一次性專案", "長期合約", "訂閱／回購制", "零售銷售", "混合型"],
      },
      {
        id: "s1_new_clients",
        label: "平均每月新增客戶數",
        type: "dropdown",
        options: ["0–2 位", "3–5 位", "6–10 位", "11–30 位", "30 位以上"],
      },
      {
        id: "s1_trend",
        label: "近半年業績狀態",
        type: "radio",
        options: ["明顯成長", "穩定持平", "略有下滑", "明顯下滑"],
      },
      {
        id: "s1_focus",
        label: "未來一年的營運重點（可複選）",
        type: "checkbox",
        options: ["開發新客源", "提高客單價", "擴編團隊", "開發新產品／服務", "拓展服務區域", "品牌與行銷", "數位轉型", "建立合作聯盟", "其他"],
      },
      {
        id: "s1_challenge",
        label: "目前最大的經營挑戰",
        type: "textarea",
        placeholder: "例如：新客源不穩定、案件量季節性落差大…",
      },
    ],
  },
  {
    id: "s2",
    num: "二",
    title: "商機機會診斷",
    subtitle: "描述你最想要的案件與客戶，讓夥伴知道怎麼幫你開門。",
    icon: "🔍",
    questions: [
      {
        id: "s2_dream_case",
        label: "我最想接到的案件類型",
        type: "textarea",
        placeholder: "描述理想案件的樣貌、規模與情境…",
      },
      {
        id: "s2_decision_maker",
        label: "理想客戶的決策者是誰（可複選）",
        type: "checkbox",
        options: ["企業主／負責人", "高階主管", "採購窗口", "行銷部門", "人資部門", "財務部門", "個人消費者", "其他"],
      },
      {
        id: "s2_company_size",
        label: "理想客戶的企業規模（可複選）",
        type: "checkbox",
        options: ["個人／家庭客戶", "10 人以下小型企業", "10–50 人中小企業", "50–200 人中型企業", "200 人以上大型企業", "政府／學校／機構"],
      },
      {
        id: "s2_budget",
        label: "理想客戶的預算區間",
        type: "dropdown",
        options: ["1 萬以下", "1–5 萬", "5–20 萬", "20–100 萬", "100–500 萬", "500 萬以上"],
      },
      {
        id: "s2_cycle",
        label: "平均成交週期",
        type: "radio",
        options: ["一週內", "一個月內", "一季內", "半年以上"],
      },
      {
        id: "s2_signals",
        label: "最容易切入的商機訊號（可複選）",
        type: "checkbox",
        options: ["公司搬遷／裝修", "展店／擴點", "大量徵才", "募資／增資", "新品上市", "法規變動", "季節性需求", "婚喪喜慶／人生階段", "其他"],
      },
      {
        id: "s2_want_to_meet",
        label: "我最想認識的對象",
        type: "textarea",
        placeholder: "例如：連鎖餐飲品牌負責人、醫療院所採購…",
      },
    ],
  },
  {
    id: "s3",
    num: "三",
    title: "BNI 成果診斷",
    subtitle: "誠實盤點 BNI 參與現況，找到提升引薦成效的施力點。",
    icon: "📈",
    questions: [
      {
        id: "s3_tenure",
        label: "加入 BNI 的時間",
        type: "dropdown",
        options: ["未滿 6 個月", "6 個月–1 年", "1–2 年", "2–5 年", "5 年以上"],
      },
      {
        id: "s3_121_per_month",
        label: "平均每月 121 次數",
        type: "dropdown",
        options: ["0–1 次", "2–4 次", "5–8 次", "9 次以上"],
      },
      {
        id: "s3_ref_given",
        label: "平均每月給出引薦數",
        type: "dropdown",
        options: ["0–1 個", "2–4 個", "5–8 個", "9 個以上"],
      },
      {
        id: "s3_ref_received",
        label: "平均每月收到引薦數",
        type: "dropdown",
        options: ["0–1 個", "2–4 個", "5–8 個", "9 個以上"],
      },
      {
        id: "s3_close_rate",
        label: "收到引薦後的平均成交率",
        type: "radio",
        options: ["10% 以下", "10–30%", "30–50%", "50% 以上"],
      },
      {
        id: "s3_bni_share",
        label: "BNI 帶來的業績佔整體比例",
        type: "radio",
        options: ["10% 以下", "10–30%", "30–50%", "50% 以上"],
      },
      {
        id: "s3_satisfaction",
        label: "目前 BNI 參與滿意度（1 分＝待加強，5 分＝非常滿意）",
        type: "scale",
      },
      {
        id: "s3_improve",
        label: "希望加強的 BNI 環節（可複選）",
        type: "checkbox",
        options: ["121 深度交流", "引薦品質訓練", "分會活動參與", "跨分會交流", "教育組課程", "主題簡報能力", "其他"],
      },
    ],
  },
  {
    id: "s4",
    num: "四",
    title: "合作深化",
    subtitle: "從單點引薦走向長期合作——找出上下游與聯盟的可能。",
    icon: "🤝",
    questions: [
      {
        id: "s4_coop_methods",
        label: "我可以提供的合作方式（可複選）",
        type: "checkbox",
        options: ["互相引薦客戶", "聯合提案投標", "共同開發產品／服務", "共享通路資源", "共同行銷曝光", "提供場地資源", "教育訓練交流", "其他"],
      },
      {
        id: "s4_target_industries",
        label: "我最期待合作的夥伴產業（可複選）",
        type: "checkbox",
        options: INDUSTRIES,
      },
      {
        id: "s4_upstream",
        label: "我的上游產業／夥伴（誰的客戶會需要我）",
        type: "textarea",
        placeholder: "例如：房仲成交後，屋主就需要室內設計…",
      },
      {
        id: "s4_downstream",
        label: "我的下游產業／夥伴（我的客戶接著會需要誰）",
        type: "textarea",
        placeholder: "例如：設計完工後，客戶會需要家具與家電…",
      },
      {
        id: "s4_events",
        label: "可以共同舉辦的活動類型（可複選）",
        type: "checkbox",
        options: ["主題講座", "工作坊／課程", "展覽／市集", "商務餐會", "直播／線上活動", "聯名企劃", "公益活動", "其他"],
      },
      {
        id: "s4_cross_sell",
        label: "交叉銷售意願（把彼此服務納入自己的方案）",
        type: "radio",
        options: ["高：可主動打包銷售", "中：可視案件搭配", "低：先以引薦為主"],
      },
      {
        id: "s4_profit_model",
        label: "偏好的合作回饋模式",
        type: "radio",
        options: ["固定介紹費", "成交比例分潤", "互惠引薦（不分潤）", "依專案個別議定"],
      },
    ],
  },
  {
    id: "s5",
    num: "五",
    title: "30 天行動計畫",
    subtitle: "把診斷變成行動——設定未來 30 天最重要的三件事。",
    icon: "🚀",
    questions: [
      {
        id: "s5_121_target",
        label: "未來 30 天的 121 目標次數",
        type: "dropdown",
        options: ["2 次", "4 次", "6 次", "8 次", "10 次以上"],
      },
      {
        id: "s5_121_list",
        label: "最想安排 121 的對象（寫下名字或產業）",
        type: "textarea",
        placeholder: "例如：李大華（醫療）、陳美玲（室內設計）…",
      },
      {
        id: "s5_ref_target",
        label: "未來 30 天的引薦目標（給出）",
        type: "dropdown",
        options: ["2 個", "4 個", "6 個", "8 個", "10 個以上"],
      },
      {
        id: "s5_key_coop",
        label: "本月最想推進的一件合作",
        type: "textarea",
        placeholder: "例如：與行銷夥伴完成聯名講座企劃…",
      },
      {
        id: "s5_help_needed",
        label: "需要分會夥伴協助的事項（可複選）",
        type: "checkbox",
        options: ["引薦特定對象", "名單交換", "活動曝光支援", "專業諮詢", "資源媒合", "其他"],
      },
      {
        id: "s5_success_look",
        label: "30 天後，怎樣算是成功？",
        type: "textarea",
        placeholder: "描述 30 天後你希望看到的具體成果…",
      },
    ],
  },
  {
    id: "s6",
    num: "六",
    title: "個人品牌與資源",
    subtitle: "這一頁就是你的商機名片——寫得越清楚，配對越精準。",
    icon: "✨",
    questions: [
      {
        id: "s6_intro_60",
        label: "我的一句介紹（60 字以內）",
        type: "textarea",
        maxLength: 60,
        placeholder: "一句話讓夥伴記住你…",
      },
      {
        id: "s6_ideal_customer",
        label: "我的理想客戶",
        type: "textarea",
        placeholder: "描述最理想客戶的產業、規模、情境…",
      },
      {
        id: "s6_no_go",
        label: "我的不接案件",
        type: "textarea",
        placeholder: "明確說出不適合引薦給你的案件類型…",
      },
      {
        id: "s6_coop_flow",
        label: "我的合作流程",
        type: "textarea",
        placeholder: "從引薦到成交，你的標準流程是什麼…",
      },
      {
        id: "s6_success_case",
        label: "成功案例",
        type: "textarea",
        placeholder: "分享一個最具代表性的成功案例…",
      },
      {
        id: "s6_resources_give",
        label: "可提供資源（可複選）",
        type: "checkbox",
        options: RESOURCES,
      },
      {
        id: "s6_resources_need",
        label: "目前需要資源（可複選）",
        type: "checkbox",
        options: RESOURCES,
      },
      {
        id: "s6_company_line",
        label: "一句話介紹我的公司",
        type: "textarea",
        placeholder: "公司最核心的價值主張…",
      },
      {
        id: "s6_regions",
        label: "服務地區（可複選）",
        type: "checkbox",
        options: REGIONS,
      },
      {
        id: "s6_industries",
        label: "服務產業（可複選）",
        type: "checkbox",
        options: INDUSTRIES,
      },
      {
        id: "s6_cross_region",
        label: "可跨區服務",
        type: "radio",
        options: ["可以", "視案件而定", "暫不跨區"],
      },
      {
        id: "s6_out_of_city",
        label: "是否接受外縣市案件",
        type: "radio",
        options: ["接受", "視案件而定", "暫不接受"],
      },
      {
        id: "s6_open_projects",
        label: "現在正在開放的合作或專案",
        helper: "目前最希望被引薦、正在推進中的合作機會或專案，AI 會優先納入媒合分析。",
        type: "textarea",
        placeholder: "例：復健診所整廠設備專案，徵室內設計與財稅夥伴，預計 Q4 前簽約…",
      },
    ],
  },
];

export const ALL_QUESTIONS = SECTIONS.flatMap((s) => s.questions);
export const TOTAL_QUESTIONS = ALL_QUESTIONS.length;
