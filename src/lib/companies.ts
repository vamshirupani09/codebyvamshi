export interface CompanyProfile {
  slug: string;
  name: string;
  tier: "Product" | "Service";
  tags: string[];
  process: string[];
  dsaTopics: string[];
  codingQuestions: string[];
  hrQuestions: string[];
  experience: string;
  roadmap: string[];
  faqs: { q: string; a: string }[];
}

const COMMON_HR = [
  "Tell me about yourself.",
  "Why do you want to join us?",
  "Describe a challenging project and your exact contribution.",
  "Tell me about a conflict in a team and how you resolved it.",
  "Where do you see yourself in 3 years?",
];

const product = (
  slug: string,
  name: string,
  tags: string[],
  process: string[],
  dsaTopics: string[],
  codingQuestions: string[],
  experience: string,
  roadmap: string[],
  faqs: { q: string; a: string }[],
  hrExtra: string[] = [],
): CompanyProfile => ({
  slug,
  name,
  tier: "Product",
  tags,
  process,
  dsaTopics,
  codingQuestions,
  hrQuestions: [...hrExtra, ...COMMON_HR],
  experience,
  roadmap,
  faqs,
});

const service = (
  slug: string,
  name: string,
  tags: string[],
  process: string[],
  dsaTopics: string[],
  codingQuestions: string[],
  experience: string,
  roadmap: string[],
  faqs: { q: string; a: string }[],
  hrExtra: string[] = [],
): CompanyProfile => ({
  ...product(slug, name, tags, process, dsaTopics, codingQuestions, experience, roadmap, faqs, hrExtra),
  tier: "Service",
});

export const COMPANIES: CompanyProfile[] = [
  product(
    "google",
    "Google",
    ["FAANG", "Algorithms", "Bar raiser"],
    ["Online assessment (2 DSA problems)", "2 phone/virtual coding rounds", "3-4 onsite rounds (coding + design)", "Googleyness & leadership", "Hiring committee review"],
    ["Graphs & BFS/DFS", "Dynamic programming", "Trees & tries", "Binary search on answer", "Heaps & intervals", "Strings"],
    ["Word Ladder II", "Number of Islands", "Longest Increasing Path in a Matrix", "Design a rate limiter", "Median of two sorted arrays"],
    "Interviewers care as much about how you reason aloud as the final code. Expect a follow-up that changes constraints and forces you to optimise.",
    ["Weeks 1-3: arrays, strings, hashing (60 problems)", "Weeks 4-6: trees, graphs, tries", "Weeks 7-8: DP patterns + binary search on answer", "Week 9: mock interviews out loud", "Week 10: system design basics + Googleyness stories"],
    [
      { q: "How hard is the coding bar?", a: "Two medium/hard problems in 45 minutes with clean, compiling code and complexity analysis." },
      { q: "Is CGPA a filter?", a: "Rarely for experienced roles; campus hiring often uses a 7.0+ cutoff." },
    ],
    ["Tell me about a time you improved something nobody asked you to."],
  ),
  product(
    "microsoft",
    "Microsoft",
    ["FAANG", "Problem solving", "Design"],
    ["Online assessment (Codility/HackerRank)", "2 technical rounds", "AS/AA round with senior engineer", "Hiring manager round"],
    ["Linked lists", "Trees & BST", "Recursion & backtracking", "Sliding window", "OOP design", "DP"],
    ["Reverse nodes in k-group", "Serialize & deserialize binary tree", "LRU Cache", "Clone a graph", "Design Snake game"],
    "Rounds mix DSA with practical design and OOP. Expect follow-up on testing and edge cases.",
    ["Weeks 1-2: OOP + linked lists", "Weeks 3-5: trees, recursion, backtracking", "Weeks 6-7: DP + graph basics", "Week 8: low-level design (parking lot, elevator)", "Week 9: mocks + behavioural"],
    [
      { q: "Do they ask low-level design?", a: "Yes — parking lot, elevator, deck of cards are common for SDE-1/2." },
      { q: "What language should I use?", a: "Any mainstream language; C#, Java, Python and C++ are all accepted." },
    ],
  ),
  product(
    "amazon",
    "Amazon",
    ["FAANG", "Leadership Principles", "Bar raiser"],
    ["Online assessment (2 problems + work simulation)", "Technical phone screen", "Loop of 4-5 rounds", "Bar raiser round"],
    ["Graphs", "Heaps & priority queues", "Sliding window", "Trees", "Greedy", "DP"],
    ["K closest points to origin", "Word Break", "Number of Islands", "Copy List with Random Pointer", "Design Amazon Locker"],
    "Half of every round is Leadership Principles. Prepare 12-15 STAR stories mapped to the 16 LPs before touching DSA.",
    ["Weeks 1-2: write 15 STAR stories", "Weeks 3-5: graphs, heaps, sliding window", "Weeks 6-7: DP + greedy", "Week 8: OOD + system design", "Week 9: LP mocks"],
    [
      { q: "How important are Leadership Principles?", a: "Critical — strong code with weak LP answers is a common rejection reason." },
      { q: "What is the bar raiser?", a: "An interviewer from another team with veto power over the hire." },
    ],
    ["Tell me about a time you disagreed with your manager (Have Backbone).", "Describe a time you delivered under a tight deadline (Deliver Results)."],
  ),
  product(
    "meta",
    "Meta",
    ["FAANG", "Speed", "Product sense"],
    ["Recruiter screen", "Technical screen (2 problems / 45 min)", "Onsite: 2 coding, 1 design, 1 behavioural"],
    ["Arrays & strings", "Graphs", "Binary search", "Intervals", "DP", "Design"],
    ["Valid Palindrome II", "Subarray Sum Equals K", "Binary Tree Vertical Order Traversal", "Merge Intervals", "Design News Feed"],
    "Pace matters — two problems in 45 minutes. Bug-free first submissions are highly valued.",
    ["Weeks 1-3: Meta-tagged top 100 problems", "Weeks 4-5: graphs + intervals", "Weeks 6-7: DP", "Week 8: system design (feed, chat)", "Week 9: timed mocks"],
    [
      { q: "Can I use a whiteboard-style editor?", a: "Yes — CoderPad without autocomplete, so practise without an IDE." },
      { q: "Is system design asked at entry level?", a: "E3 usually skips it; E4+ always includes it." },
    ],
  ),
  product(
    "apple",
    "Apple",
    ["FAANG", "Depth", "Team-specific"],
    ["Recruiter call", "Technical phone screen", "4-6 team rounds", "Director round"],
    ["Arrays", "Strings", "Trees", "Concurrency", "Memory management", "OS fundamentals"],
    ["Implement a thread-safe LRU cache", "Detect cycle in a linked list", "Design an image loading library", "Rotate matrix in place"],
    "Highly team-dependent. Deep questions on the exact stack the team owns — read the job description carefully.",
    ["Weeks 1-3: core DSA", "Weeks 4-5: OS, memory, concurrency", "Weeks 6-7: projects deep-dive prep", "Week 8: team-specific tech + mocks"],
    [
      { q: "Do teams interview differently?", a: "Yes, each team runs its own loop with its own emphasis." },
      { q: "How deep do they go on projects?", a: "Very deep — expect line-level questions about your own code." },
    ],
  ),
  product(
    "cisco",
    "Cisco",
    ["Networking", "Systems"],
    ["Online test (aptitude + DSA + networking)", "2 technical rounds", "Managerial round", "HR round"],
    ["Arrays", "Linked lists", "Trees", "Networking basics", "OS & DBMS", "C/C++ pointers"],
    ["Detect loop in linked list", "Implement a simple TCP-like retransmission", "Find duplicate in array", "Subnet calculation"],
    "Strong emphasis on CS fundamentals: TCP/IP, routing, OS scheduling and DBMS normalisation.",
    ["Weeks 1-2: C/C++ + pointers", "Weeks 3-4: core DSA", "Weeks 5-6: CN + OS + DBMS", "Week 7: projects + mocks"],
    [
      { q: "Is networking mandatory?", a: "For most roles yes — at minimum OSI, TCP vs UDP, and subnetting." },
      { q: "Is aptitude part of the test?", a: "Yes, the first round usually mixes aptitude with coding." },
    ],
  ),
  product(
    "oracle",
    "Oracle",
    ["Database", "Java"],
    ["Online assessment", "2-3 technical rounds", "Manager round", "HR round"],
    ["Arrays & strings", "Trees", "SQL & query optimisation", "DBMS internals", "Java collections", "DP basics"],
    ["Nth highest salary in SQL", "Merge k sorted lists", "Implement HashMap", "Indexing trade-offs question"],
    "SQL and DBMS depth separates candidates. Expect joins, indexes, transactions and isolation levels.",
    ["Weeks 1-2: SQL + DBMS", "Weeks 3-5: DSA core", "Weeks 6-7: Java/OOP", "Week 8: mocks"],
    [
      { q: "How much SQL is asked?", a: "Usually at least one full round of query writing and optimisation." },
      { q: "Which language do they prefer?", a: "Java is most common, but any language is accepted for DSA." },
    ],
  ),
  product(
    "adobe",
    "Adobe",
    ["Product", "C++"],
    ["Online assessment (DSA + aptitude)", "2-3 technical rounds", "Hiring manager", "HR"],
    ["Arrays", "Strings", "Trees & graphs", "DP", "OOP design", "C++ internals"],
    ["Longest palindromic substring", "Design an undo/redo stack", "LRU cache", "Trapping rain water"],
    "Interviewers push on design of small systems (image editor features, undo stacks) plus solid DSA.",
    ["Weeks 1-3: DSA core", "Weeks 4-5: DP + strings", "Weeks 6-7: OOP/LLD", "Week 8: mocks + puzzles"],
    [
      { q: "Are puzzles asked?", a: "Occasionally in early rounds — practise a few classic ones." },
      { q: "Is C++ required?", a: "Not required, but many teams are C++ heavy." },
    ],
  ),
  product(
    "salesforce",
    "Salesforce",
    ["Cloud", "SaaS"],
    ["Online assessment", "Technical screen", "Onsite: coding, design, values", "Hiring manager"],
    ["Arrays & hashing", "Trees", "Graphs", "API design", "System design", "SQL"],
    ["Design a multi-tenant rate limiter", "Group anagrams", "Meeting rooms II", "Design an audit log"],
    "Multi-tenancy, APIs and clean abstractions dominate. Values-based rounds are taken seriously.",
    ["Weeks 1-3: DSA core", "Weeks 4-5: API + system design", "Weeks 6-7: SQL + cloud basics", "Week 8: values mocks"],
    [
      { q: "What is the values round?", a: "A behavioural round on trust, customer success and equality." },
      { q: "Do they ask Apex?", a: "Only for Salesforce-platform specific roles." },
    ],
  ),
  service(
    "accenture",
    "Accenture",
    ["Mass hiring", "Cognitive test"],
    ["Cognitive & technical assessment", "Coding round (2 problems)", "Communication assessment", "Technical interview", "HR round"],
    ["Arrays", "Strings", "Basic recursion", "SQL", "OOP concepts", "DBMS"],
    ["Reverse a string without built-ins", "Find second largest element", "Fibonacci with memoisation", "Basic SQL joins"],
    "Volume hiring with a heavy aptitude and communication component; coding is easy-to-medium.",
    ["Weeks 1-2: aptitude + verbal", "Weeks 3-4: easy DSA (100 problems)", "Week 5: SQL + OOP", "Week 6: HR + communication practice"],
    [
      { q: "How hard is the coding round?", a: "Two easy/medium problems — pattern printing, strings, arrays." },
      { q: "Is communication scored?", a: "Yes, there is a dedicated communication assessment." },
    ],
  ),
  service(
    "cognizant",
    "Cognizant",
    ["Mass hiring", "GenC"],
    ["Aptitude round", "Coding round", "Technical interview", "HR round"],
    ["Arrays", "Strings", "Recursion", "OOP", "SQL", "DBMS"],
    ["Palindrome check", "Matrix spiral print", "Remove duplicates from array", "SQL group by queries"],
    "GenC and GenC Next tracks differ — GenC Next has harder coding and pays significantly more.",
    ["Weeks 1-2: aptitude", "Weeks 3-4: easy/medium DSA", "Week 5: SQL + OOP + project prep", "Week 6: HR mocks"],
    [
      { q: "GenC vs GenC Next?", a: "GenC Next requires stronger DSA and offers a higher package." },
      { q: "Is there a bond?", a: "Service agreements are common — read the offer letter carefully." },
    ],
  ),
  service(
    "virtusa",
    "Virtusa",
    ["Service", "Java"],
    ["Online assessment", "Technical interview", "Managerial round", "HR round"],
    ["Arrays", "Strings", "Collections", "OOP", "SQL", "Spring basics"],
    ["Find missing number", "String compression", "Java collections comparison", "Simple CRUD design"],
    "Java plus SQL fundamentals carry most of the interview; projects are discussed in depth.",
    ["Weeks 1-2: Java + OOP", "Weeks 3-4: DSA basics", "Week 5: SQL + Spring", "Week 6: project + HR prep"],
    [
      { q: "Which stack is preferred?", a: "Java/Spring and .NET are the most common." },
      { q: "How technical is the managerial round?", a: "Mostly project-based with scenario questions." },
    ],
  ),
  service(
    "infosys",
    "Infosys",
    ["Mass hiring", "InfyTQ"],
    ["InfyTQ / online assessment", "Technical interview", "HR interview"],
    ["Arrays", "Strings", "Recursion", "DBMS", "SQL", "Python/Java basics"],
    ["Armstrong number", "Sort without built-in sort", "SQL nested queries", "Basic OOP inheritance question"],
    "InfyTQ certification can fast-track you to the Power Programmer track with a higher package.",
    ["Weeks 1-2: aptitude + verbal", "Weeks 3-4: Python or Java basics + easy DSA", "Week 5: DBMS + SQL", "Week 6: HR prep"],
    [
      { q: "What is Power Programmer?", a: "A premium track requiring strong coding in the InfyTQ final round." },
      { q: "Is training mandatory?", a: "Yes, Mysore training with an assessment at the end." },
    ],
  ),
  service(
    "tcs",
    "TCS",
    ["Mass hiring", "NQT"],
    ["TCS NQT (aptitude + coding)", "Technical interview", "Managerial round", "HR round"],
    ["Arrays", "Strings", "Loops & patterns", "C fundamentals", "DBMS", "SQL"],
    ["Star pattern printing", "Prime numbers in range", "String reversal", "Simple file handling in C"],
    "NQT score decides the track — Ninja, Digital or Prime. Prime requires strong coding and projects.",
    ["Weeks 1-3: NQT aptitude + verbal + reasoning", "Weeks 4-5: C/Python basics + patterns", "Week 6: DBMS + projects", "Week 7: HR mocks"],
    [
      { q: "Ninja vs Digital vs Prime?", a: "Higher NQT and advanced coding scores unlock Digital and Prime offers." },
      { q: "Is C mandatory?", a: "No, but many NQT coding questions are C-flavoured." },
    ],
  ),
  service(
    "capgemini",
    "Capgemini",
    ["Service", "Game-based test"],
    ["Game-based aptitude", "Pseudocode & English test", "Coding round", "Technical interview", "HR round"],
    ["Arrays", "Strings", "Pseudocode logic", "OOP", "SQL", "DBMS"],
    ["Pseudocode output prediction", "Count vowels", "Bubble sort implementation", "SQL joins"],
    "The pseudocode section is unusual — practise reading and tracing code rather than writing it.",
    ["Weeks 1-2: pseudocode + aptitude", "Weeks 3-4: easy DSA", "Week 5: SQL + OOP", "Week 6: HR prep"],
    [
      { q: "What is the game-based test?", a: "Timed cognitive mini-games measuring attention and logic." },
      { q: "Is English scored separately?", a: "Yes, there is a dedicated English communication section." },
    ],
  ),
  service(
    "wipro",
    "Wipro",
    ["Mass hiring", "Elite NTH"],
    ["Elite NTH online test", "Coding round", "Business discussion / technical", "HR round"],
    ["Arrays", "Strings", "Recursion", "OOP", "SQL", "OS basics"],
    ["Sum of digits", "Check anagram", "Matrix transpose", "Simple SQL aggregation"],
    "The business discussion round blends technical questions with situational judgement.",
    ["Weeks 1-2: aptitude + essay writing", "Weeks 3-4: easy DSA", "Week 5: SQL + OS", "Week 6: HR + project prep"],
    [
      { q: "Is there an essay?", a: "Yes, a written communication test is part of Elite NTH." },
      { q: "Turbo hiring?", a: "A faster track with a higher package for strong coders." },
    ],
  ),
  service(
    "hcl",
    "HCL",
    ["Service", "TechBee"],
    ["Online assessment", "Technical interview", "HR interview"],
    ["Arrays", "Strings", "OOP", "SQL", "Networking basics", "OS basics"],
    ["Reverse words in a sentence", "Find duplicates", "Basic SQL queries", "OOP pillars explanation"],
    "Interviews stay close to fundamentals and your resume projects; keep explanations crisp.",
    ["Weeks 1-2: fundamentals (OOP, OS, DBMS)", "Weeks 3-4: easy DSA", "Week 5: projects", "Week 6: HR prep"],
    [
      { q: "What is TechBee?", a: "An early-career programme for candidates right after 12th grade." },
      { q: "How long is the process?", a: "Usually completed within one to two weeks." },
    ],
  ),
  product(
    "ibm",
    "IBM",
    ["Enterprise", "Cloud & AI"],
    ["Cognitive ability assessment", "Coding assessment", "Technical interview", "HR / behavioural"],
    ["Arrays & strings", "Trees", "SQL", "Cloud fundamentals", "Python", "OOP"],
    ["Merge intervals", "Word frequency counter", "SQL window functions", "Design a simple ETL pipeline"],
    "Cloud, data and AI roles dominate hiring; Python plus SQL is the most useful combination.",
    ["Weeks 1-2: Python + SQL", "Weeks 3-5: DSA core", "Weeks 6-7: cloud + data fundamentals", "Week 8: mocks"],
    [
      { q: "Is cloud knowledge required?", a: "Helpful for most roles — know containers, CI/CD and one cloud provider." },
      { q: "How long is the process?", a: "Typically two to four weeks end to end." },
    ],
  ),
];

export function companyBySlug(slug: string) {
  return COMPANIES.find((c) => c.slug === slug);
}
