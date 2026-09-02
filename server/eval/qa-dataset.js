// qa-dataset.js
// Hand-written QA pairs grounded in server/uploads/hbs-lean-startup.pdf
// ("Hypothesis-Driven Entrepreneurship: The Lean Startup", Eisenmann/Ries/Dillard, HBS 812-095).
//
// Every `referenceAnswer` and `evidenceKeywords` entry was checked by hand against the
// extracted PDF text (pages 1-14) before being written here — nothing is invented.
// `evidenceKeywords` are short phrases that should appear in whichever chunk(s) actually
// contain the answer; run-eval.js uses them as a retrieval-quality proxy (does the
// top-k retrieved context actually contain the supporting text, not just "an answer").

export const qaDataset = [
  {
    id: 1,
    question: "What is a minimum viable product (MVP) according to this note?",
    referenceAnswer:
      "The smallest set of features and/or activities needed to complete a Build-Measure-Learn cycle and thereby test a business model hypothesis.",
    evidenceKeywords: ["Build-Measure-Learn", "minimum viable product"],
  },
  {
    id: 2,
    question: "What is product-market fit?",
    referenceAnswer:
      "The venture has the right product for the market: demonstrated demand from early adopters and solid profit potential, meaning it can deliver adequate value to employees, customers, partners, and investors.",
    evidenceKeywords: ["product-market fit means", "right product for the market"],
  },
  {
    id: 3,
    question:
      "What are the three alternative approaches to lean startup mentioned in the note (besides hypothesis-driven entrepreneurship)?",
    referenceAnswer:
      "Build-It-And-They-Will-Come, Waterfall Planning, and Just Do It!",
    evidenceKeywords: ["Build-It-And-They-Will-Come", "Waterfall Planning", "Just Do It"],
  },
  {
    id: 4,
    question: "What four elements make up a business model according to the note?",
    referenceAnswer:
      "Customer Value Proposition, Go-To-Market Plan, Technology & Operations Management, and Cash Flow Formula.",
    evidenceKeywords: [
      "Customer Value Proposition",
      "Go-To-Market Plan",
      "Technology & Operations Management",
      "Cash Flow Formula",
    ],
  },
  {
    id: 5,
    question: "Who coined the term \"lean startup\"?",
    referenceAnswer: "Eric Ries.",
    evidenceKeywords: ["Eric Ries", "coined the term"],
  },
  {
    id: 6,
    question: "What rental rate did Rent the Runway's PDF-trial MVP achieve?",
    referenceAnswer: "5%.",
    evidenceKeywords: ["5%", "PDF trial"],
  },
  {
    id: 7,
    question: "What feature did IMVU's MVP intentionally leave out to constrain functionality?",
    referenceAnswer:
      "The ability for avatars to walk (\"ambulation\") between locations — users instead had instantaneous teleporting.",
    evidenceKeywords: ["teleporting", "IMVU"],
  },
  {
    id: 8,
    question: "How did Aardvark's \"mechanical Turk\" MVP work?",
    referenceAnswer:
      "Human operators, not computer algorithms, routed users' SMS questions to people in their social network who could answer them.",
    evidenceKeywords: ["mechanical Turk", "Aardvark", "human operators"],
  },
  {
    id: 9,
    question:
      "What is the difference between a false positive and a false negative when interpreting MVP test results?",
    referenceAnswer:
      "A false positive means a hypothesis is confirmed when it is actually not valid; a false negative means a hypothesis is disconfirmed when it is actually valid.",
    evidenceKeywords: ["false positive", "false negative"],
  },
  {
    id: 10,
    question:
      "What did Facebook do differently between the Beacon and News Feed features, and why?",
    referenceAnswer:
      "Facebook dropped Beacon but kept News Feed, because usage data showed users were engaging with News Feed but not Beacon — it acted on revealed rather than stated preferences.",
    evidenceKeywords: ["Beacon", "News Feed", "revealed"],
  },
  {
    id: 11,
    question: "What product was PayPal originally designed for, and what did it pivot to?",
    referenceAnswer:
      "PayPal was originally designed to let Palm Pilot users exchange money electronically; it pivoted to focus on its demo website, and later supported eBay auction listings.",
    evidenceKeywords: ["Palm Pilot", "PayPal"],
  },
  {
    id: 12,
    question:
      "What are the three decision options an entrepreneur has after evaluating MVP test results (Step 6)?",
    referenceAnswer: "Persevere, pivot, or perish.",
    evidenceKeywords: ["Persevere", "Pivot", "Perish"],
  },
  {
    id: 13,
    question: "According to the note, how does Eric Ries define a pivot?",
    referenceAnswer: "Changing strategy while retaining one's original vision.",
    evidenceKeywords: ["changing strategy while retaining"],
  },
  {
    id: 14,
    question:
      "What example does the note give of a bad (unfalsifiable) go-to-market hypothesis versus a good (falsifiable) one?",
    referenceAnswer:
      "Bad: \"our product will spread through word-of-mouth\" (can't fail). Good: \"our viral coefficient over the next twelve months will exceed 0.5\" (can be rejected).",
    evidenceKeywords: ["viral coefficient", "word-of-mouth"],
  },
  {
    id: 15,
    question: "What is a cohort in the context of cohort analysis?",
    referenceAnswer:
      "A set of customers acquired during a specific period of time, often through the same marketing method.",
    evidenceKeywords: ["cohort encompasses", "cohort analysis"],
  },
  {
    id: 16,
    question:
      "What three situations does the note describe where lean startup methods yield fewer advantages?",
    referenceAnswer:
      "When mistakes must be limited, when uncertainty about customer demand is low, and when long product development cycles preclude launching early and often.",
    evidenceKeywords: ["mistakes must be limited", "demand uncertainty is low"],
  },
  {
    id: 17,
    question:
      "Why can't the \"launch early and often\" approach be used for an unmanned interplanetary mission?",
    referenceAnswer:
      "Once it's launched, planners have no way to correct hardware design mistakes, so more contingent planning is required upfront instead.",
    evidenceKeywords: ["interplanetary mission", "no way to correct"],
  },
  {
    id: 18,
    question:
      "What smoke test did Dropbox use to validate demand before having a fully working, debugged product?",
    referenceAnswer: "An online video demonstration of the product's features.",
    evidenceKeywords: ["Dropbox", "video demonstration"],
  },
  {
    id: 19,
    question:
      "What is \"escalation of commitment,\" and what cognitive biases contribute to it?",
    referenceAnswer:
      "A tendency to ignore disconfirming data and keep investing when big, ongoing investments are made before outcomes are known; driven by optimism bias, the planning fallacy, confirmation bias, and the sunk cost fallacy.",
    evidenceKeywords: ["escalation of commitment", "sunk cost fallacy"],
  },
  {
    id: 20,
    question: "What two ways can an MVP be \"minimal,\" according to the note?",
    referenceAnswer:
      "It can constrain product functionality and/or constrain operational capability.",
    evidenceKeywords: ["constrain product functionality", "constrained operational capability"],
  },
  {
    id: 21,
    question: "What are the six stages of waterfall (\"stage-gate\") planning listed in the note?",
    referenceAnswer:
      "Concept exploration, product specification, product design, product development, internal testing, and alpha launch with pilot customers.",
    evidenceKeywords: ["Concept exploration", "Alpha launch"],
  },
  {
    id: 22,
    question:
      "What was SnapTax's approach to constraining its MVP, and which company made it?",
    referenceAnswer:
      "Intuit tested SnapTax by initially offering a version only for California residents with simple 1040EZ returns, excluding other states and more complex returns.",
    evidenceKeywords: ["SnapTax", "Intuit", "1040EZ"],
  },
  {
    id: 23,
    question: "What two concerns do entrepreneurs often express about launching MVPs early?",
    referenceAnswer:
      "Exposure to idea theft (competitors stealing the concept) and reputational risk (launching something with limited features or bugs).",
    evidenceKeywords: ["Exposure to Idea Theft", "Reputational Risk"],
  },
  {
    id: 24,
    question: "What tradeoff is involved in parallel testing of business model hypotheses?",
    referenceAnswer:
      "If hypotheses tested in parallel and one is decisively rejected in a way that makes the other irrelevant, the effort on the other was wasted; but if both are validated, parallel testing gains a time-to-market edge versus sequential testing.",
    evidenceKeywords: ["parallel testing", "time-to-market"],
  },
  {
    id: 25,
    question:
      "According to the note's conclusion, what two new concepts does the lean startup approach introduce beyond its intellectual antecedents?",
    referenceAnswer:
      "Minimum viable products, which efficiently test business model hypotheses, and pivots, which change certain business model elements in response to failed hypothesis tests.",
    evidenceKeywords: ["minimum viable products", "pivots that"],
  },
];
