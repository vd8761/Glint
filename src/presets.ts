import { CertificateTemplate, TextElement } from './types';

interface PresetDef {
  name: string;
  programName: string;
  category: 'Technology & MNC' | 'Business & Consulting' | 'Academic & University' | 'Creative & Design' | 'Health & Wellness' | 'Professional Certifications';
  theme: 'tech' | 'corporate' | 'academic' | 'modern_minimal' | 'premium_dark' | 'artistic' | 'health_sport';
  color: string;
  borderColor: string;
  signatory1: string;
  title1: string;
  signatory2?: string;
  title2?: string;
  sealType?: 'classic' | 'modern' | 'stellar' | 'none' | 'crimson_wax' | 'emerald_shield' | 'gold_medallion';
  borderStyle?: 'solid' | 'double' | 'dashed' | 'ornate' | 'none';
  decorFlourish?: 'classic' | 'modern' | 'ornate' | 'minimal' | 'none';
  logoIconType?: string;
}

const PRESET_DEFINITIONS: PresetDef[] = [
  // Technology & MNC (15 presets)
  {
    name: 'Google Cloud Professional Certification',
    programName: 'Google Cloud Certified Professional Cloud Architect',
    category: 'Technology & MNC',
    theme: 'tech',
    color: '#1A73E8',
    borderColor: '#4285F4',
    signatory1: 'Sundar Pichai',
    title1: 'CEO, Google LLC',
    signatory2: 'Thomas Kurian',
    title2: 'CEO, Google Cloud',
    sealType: 'gold_medallion',
    decorFlourish: 'minimal'
  },
  {
    name: 'Microsoft Solutions Expert Certification',
    programName: 'Microsoft Certified Solutions Expert (MCSE)',
    category: 'Technology & MNC',
    theme: 'tech',
    color: '#0078D4',
    borderColor: '#00A4EF',
    signatory1: 'Satya Nadella',
    title1: 'CEO, Microsoft Corporation',
    sealType: 'stellar',
    decorFlourish: 'minimal'
  },
  {
    name: 'IBM Cognitive Enterprise Certification',
    programName: 'IBM AI & Cognitive Solutions Specialist',
    category: 'Technology & MNC',
    theme: 'corporate',
    color: '#0F62FE',
    borderColor: '#0F62FE',
    signatory1: 'Arvind Krishna',
    title1: 'Chairman & CEO, IBM',
    signatory2: 'Dr. John Kelly III',
    title2: 'SVP, Cognitive Solutions',
    sealType: 'classic',
    decorFlourish: 'none'
  },
  {
    name: 'Amazon AWS Certified Solutions Architect',
    programName: 'AWS Certified Solutions Architect - Professional',
    category: 'Technology & MNC',
    theme: 'tech',
    color: '#FF9900',
    borderColor: '#232F3E',
    signatory1: 'Andy Jassy',
    title1: 'CEO, Amazon.com',
    sealType: 'stellar',
    decorFlourish: 'minimal'
  },
  {
    name: 'Salesforce Certified Technical Architect',
    programName: 'Salesforce Certified Technical Architect (CTA)',
    category: 'Technology & MNC',
    theme: 'corporate',
    color: '#00A1E0',
    borderColor: '#00396B',
    signatory1: 'Marc Benioff',
    title1: 'Chair & CEO, Salesforce',
    sealType: 'modern',
    decorFlourish: 'none'
  },
  {
    name: 'Oracle Certified Java Enterprise Architect',
    programName: 'Oracle Certified Enterprise Architect - Java EE',
    category: 'Technology & MNC',
    theme: 'corporate',
    color: '#F80000',
    borderColor: '#7F0000',
    signatory1: 'Safra Catz',
    title1: 'CEO, Oracle Corporation',
    sealType: 'classic',
    decorFlourish: 'classic'
  },
  {
    name: 'Apple Certified iOS Developer',
    programName: 'Apple Certified iOS Application Developer Master',
    category: 'Technology & MNC',
    theme: 'modern_minimal',
    color: '#111111',
    borderColor: '#555555',
    signatory1: 'Tim Cook',
    title1: 'CEO, Apple Inc.',
    sealType: 'none',
    decorFlourish: 'none'
  },
  {
    name: 'Meta Platforms Engineering Lead',
    programName: 'Meta Certified Systems Engineering Specialist',
    category: 'Technology & MNC',
    theme: 'tech',
    color: '#0064E0',
    borderColor: '#1C2B33',
    signatory1: 'Mark Zuckerberg',
    title1: 'Founder & CEO, Meta Platforms',
    sealType: 'stellar',
    decorFlourish: 'none'
  },
  {
    name: 'Netflix Systems Architect Certification',
    programName: 'Netflix Advanced Microservices Infrastructure Certification',
    category: 'Technology & MNC',
    theme: 'premium_dark',
    color: '#E50914',
    borderColor: '#E50914',
    signatory1: 'Ted Sarandos',
    title1: 'Co-CEO, Netflix Inc.',
    sealType: 'modern',
    decorFlourish: 'minimal'
  },
  {
    name: 'Zoom Video Communications Administrator',
    programName: 'Zoom Certified Enterprise Administrator',
    category: 'Technology & MNC',
    theme: 'corporate',
    color: '#2D8CFF',
    borderColor: '#0B3C5D',
    signatory1: 'Eric Yuan',
    title1: 'CEO, Zoom Communications',
    sealType: 'modern',
    decorFlourish: 'minimal'
  },
  {
    name: 'Slack Certified Administrator Program',
    programName: 'Slack Certified Administrator & Architect',
    category: 'Technology & MNC',
    theme: 'tech',
    color: '#4A154B',
    borderColor: '#ECB22E',
    signatory1: 'Lidiane Jones',
    title1: 'CEO, Slack Technologies',
    sealType: 'modern',
    decorFlourish: 'none'
  },
  {
    name: 'Shopify Liquid Theme Developer Cert',
    programName: 'Shopify Certified Liquid Developer',
    category: 'Technology & MNC',
    theme: 'corporate',
    color: '#96BF48',
    borderColor: '#5E8E3E',
    signatory1: 'Tobias Lütke',
    title1: 'CEO, Shopify',
    sealType: 'modern',
    decorFlourish: 'none'
  },
  {
    name: 'Vercel Frontend Infrastructure Specialist',
    programName: 'Vercel Certified Edge Computing & NextJS Engineer',
    category: 'Technology & MNC',
    theme: 'modern_minimal',
    color: '#000000',
    borderColor: '#000000',
    signatory1: 'Guillermo Rauch',
    title1: 'CEO, Vercel Inc.',
    sealType: 'stellar',
    decorFlourish: 'none'
  },
  {
    name: 'AWS DevOps Engineer - Professional Cert',
    programName: 'AWS Certified DevOps Engineer - Professional',
    category: 'Technology & MNC',
    theme: 'tech',
    color: '#FF9900',
    borderColor: '#FF9900',
    signatory1: 'Selipsky Adam',
    title1: 'CEO, AWS Services',
    sealType: 'gold_medallion',
    decorFlourish: 'minimal'
  },
  {
    name: 'Cisco Certified Network Professional',
    programName: 'Cisco Certified Network Professional (CCNP) Routing',
    category: 'Technology & MNC',
    theme: 'corporate',
    color: '#049FD9',
    borderColor: '#0D2C54',
    signatory1: 'Chuck Robbins',
    title1: 'CEO, Cisco Systems',
    sealType: 'classic',
    decorFlourish: 'none'
  },

  // Business & Consulting (10 presets)
  {
    name: 'McKinsey Strategy Fellowship Program',
    programName: 'McKinsey Global Strategic Leadership Fellow',
    category: 'Business & Consulting',
    theme: 'premium_dark',
    color: '#C5A880',
    borderColor: '#C5A880',
    signatory1: 'Bob Sternfels',
    title1: 'Global Managing Partner, McKinsey',
    sealType: 'emerald_shield',
    decorFlourish: 'minimal'
  },
  {
    name: 'Deloitte Digital Consultant Certification',
    programName: 'Deloitte Digital Transformation Senior Consultant',
    category: 'Business & Consulting',
    theme: 'corporate',
    color: '#86BC25',
    borderColor: '#000000',
    signatory1: 'Joe Ucuzoglu',
    title1: 'Global CEO, Deloitte',
    sealType: 'modern',
    decorFlourish: 'none'
  },
  {
    name: 'Accenture Strategy Consultant Credentials',
    programName: 'Accenture Strategy Leadership & Industry 4.0 Specialization',
    category: 'Business & Consulting',
    theme: 'corporate',
    color: '#A100FF',
    borderColor: '#1D1D1D',
    signatory1: 'Julie Sweet',
    title1: 'CEO, Accenture',
    sealType: 'stellar',
    decorFlourish: 'none'
  },
  {
    name: 'KPMG Financial Audit Specialist',
    programName: 'KPMG International Financial Audit & Assurance Expert',
    category: 'Business & Consulting',
    theme: 'corporate',
    color: '#00338D',
    borderColor: '#00338D',
    signatory1: 'Bill Thomas',
    title1: 'Global Chairman, KPMG',
    sealType: 'classic',
    decorFlourish: 'classic'
  },
  {
    name: 'PwC Risk Assurance Partner Specialist',
    programName: 'PwC Risk Assurance & Cybersecurity Audit Master',
    category: 'Business & Consulting',
    theme: 'corporate',
    color: '#D85604',
    borderColor: '#EB8C00',
    signatory1: 'Bob Moritz',
    title1: 'Global Chairman, PwC Network',
    sealType: 'classic',
    decorFlourish: 'none'
  },
  {
    name: 'EY Transaction & Capital Advisory Cert',
    programName: 'EY Transactions & Capital Advisory Specialist',
    category: 'Business & Consulting',
    theme: 'corporate',
    color: '#FFE600',
    borderColor: '#2E2E38',
    signatory1: 'Carmine Di Sibio',
    title1: 'Global Chairman & CEO, EY',
    sealType: 'modern',
    decorFlourish: 'none'
  },
  {
    name: 'Goldman Sachs Investment Banking Fellow',
    programName: 'Goldman Sachs Senior Investment Banking Specialist',
    category: 'Business & Consulting',
    theme: 'premium_dark',
    color: '#B39D76',
    borderColor: '#AE8B53',
    signatory1: 'David Solomon',
    title1: 'Chairman & CEO, Goldman Sachs',
    sealType: 'gold_medallion',
    decorFlourish: 'classic'
  },
  {
    name: 'JP Morgan Corporate Finance Specialist',
    programName: 'JPMorgan Chase Corporate Treasury & Asset Manager',
    category: 'Business & Consulting',
    theme: 'corporate',
    color: '#1F2937',
    borderColor: '#B5A642',
    signatory1: 'Jamie Dimon',
    title1: 'CEO, JPMorgan Chase',
    sealType: 'classic',
    decorFlourish: 'classic'
  },
  {
    name: 'BCG Strategic Growth formulation Specialist',
    programName: 'BCG Strategy Academy Senior Analyst Program',
    category: 'Business & Consulting',
    theme: 'corporate',
    color: '#00875A',
    borderColor: '#002C1B',
    signatory1: 'Christoph Schweizer',
    title1: 'CEO, Boston Consulting Group',
    sealType: 'emerald_shield',
    decorFlourish: 'none'
  },
  {
    name: 'Bain & Company Management Associate Cert',
    programName: 'Bain Management Consultant & Strategy Specialization',
    category: 'Business & Consulting',
    theme: 'corporate',
    color: '#CC0000',
    borderColor: '#222222',
    signatory1: 'Manny Maceda',
    title1: 'Worldwide Managing Partner, Bain',
    sealType: 'stellar',
    decorFlourish: 'none'
  },

  // Academic & University (10 presets)
  {
    name: 'Harvard Business Leadership executive',
    programName: 'Harvard Business Administration Leadership Certification',
    category: 'Academic & University',
    theme: 'academic',
    color: '#A51C30',
    borderColor: '#A51C30',
    signatory1: 'Prof. Lawrence S. Bacow',
    title1: 'President of the University',
    signatory2: 'Dean Srikant Datar',
    title2: 'Dean of the Business Faculty',
    sealType: 'crimson_wax',
    borderStyle: 'double',
    decorFlourish: 'ornate'
  },
  {
    name: 'MIT Computer Science Research Award',
    programName: 'MIT Advanced Computer Science Research Fellowship',
    category: 'Academic & University',
    theme: 'academic',
    color: '#8A1B3B',
    borderColor: '#8A1B3B',
    signatory1: 'Sally Kornbluth',
    title1: 'President, MIT',
    sealType: 'classic',
    borderStyle: 'solid',
    decorFlourish: 'classic'
  },
  {
    name: 'Stanford Design Thinking Academy Fellowship',
    programName: 'Stanford d.school Design Thinking Expert Certification',
    category: 'Academic & University',
    theme: 'academic',
    color: '#8C1515',
    borderColor: '#B83A4B',
    signatory1: 'Marc Tessier-Lavigne',
    title1: 'President, Stanford University',
    sealType: 'crimson_wax',
    decorFlourish: 'ornate'
  },
  {
    name: 'Yale Creative Writing Excellence Program',
    programName: 'Yale Literary & Creative Writing Fellowship Master',
    category: 'Academic & University',
    theme: 'academic',
    color: '#00356B',
    borderColor: '#00356B',
    signatory1: 'Peter Salovey',
    title1: 'President, Yale University',
    sealType: 'emerald_shield',
    decorFlourish: 'ornate'
  },
  {
    name: 'Oxford Advanced Jurisprudence Certification',
    programName: 'Oxford Advanced Certification in Jurisprudence Studies',
    category: 'Academic & University',
    theme: 'academic',
    color: '#002147',
    borderColor: '#002147',
    signatory1: 'Prof. Irene Tracey',
    title1: 'Vice-Chancellor, Oxford University',
    sealType: 'crimson_wax',
    decorFlourish: 'ornate'
  },
  {
    name: 'Cambridge Mathematical Tripos Honors Cert',
    programName: 'Cambridge Mathematical Tripos Honors Certification',
    category: 'Academic & University',
    theme: 'academic',
    color: '#002F6C',
    borderColor: '#D4AF37',
    signatory1: 'Prof. Deborah Prentice',
    title1: 'Vice-Chancellor, Cambridge',
    sealType: 'gold_medallion',
    decorFlourish: 'ornate'
  },
  {
    name: 'Columbia Journalism School Fellowship Cert',
    programName: 'Columbia Journalism School Master Fellowship Program',
    category: 'Academic & University',
    theme: 'academic',
    color: '#75AADB',
    borderColor: '#1D3B5C',
    signatory1: 'Minouche Shafik',
    title1: 'President, Columbia University',
    sealType: 'classic',
    decorFlourish: 'classic'
  },
  {
    name: 'Berkeley Physics Research Excellence Award',
    programName: 'UC Berkeley Physics Research & Laboratory Honors',
    category: 'Academic & University',
    theme: 'academic',
    color: '#003262',
    borderColor: '#FDB515',
    signatory1: 'Carol T. Christ',
    title1: 'Chancellor, UC Berkeley',
    sealType: 'stellar',
    decorFlourish: 'classic'
  },
  {
    name: 'Wharton Executive MBA Leadership Credentials',
    programName: 'Executive Master of Business Administration Fellowship',
    category: 'Academic & University',
    theme: 'academic',
    color: '#013C7B',
    borderColor: '#9E1B32',
    signatory1: 'Dean Erika James',
    title1: 'Dean of the Wharton School',
    sealType: 'gold_medallion',
    decorFlourish: 'classic'
  },
  {
    name: 'Princeton Advanced Mathematics Fellowship',
    programName: 'Princeton University Advanced Mathematics Fellowship',
    category: 'Academic & University',
    theme: 'academic',
    color: '#EE7F2D',
    borderColor: '#000000',
    signatory1: 'Christopher L. Eisgruber',
    title1: 'President, Princeton University',
    sealType: 'classic',
    decorFlourish: 'ornate'
  },

  // Creative & Design (8 presets)
  {
    name: 'Creative Design Awards Certificate',
    programName: 'International Creative Design Gold Medallist Award',
    category: 'Creative & Design',
    theme: 'artistic',
    color: '#E11D48',
    borderColor: '#F43F5E',
    signatory1: 'Jonathan Ive',
    title1: 'Head of Jury, Creative Design Committee',
    sealType: 'gold_medallion',
    decorFlourish: 'classic'
  },
  {
    name: 'Master Photography Academy Studio Expert',
    programName: 'Certified Studio & Portrait Photography Master',
    category: 'Creative & Design',
    theme: 'modern_minimal',
    color: '#020617',
    borderColor: '#334155',
    signatory1: 'Annie Leibovitz',
    title1: 'President, Master Photography Academy',
    sealType: 'none',
    decorFlourish: 'none'
  },
  {
    name: 'Royal Music Academy Violin Certification',
    programName: 'Royal Music Academy Violin Master Excellence Diploma',
    category: 'Creative & Design',
    theme: 'artistic',
    color: '#854D0E',
    borderColor: '#A16207',
    signatory1: 'Itzhak Perlman',
    title1: 'Director, Royal Violin Faculty',
    sealType: 'classic',
    decorFlourish: 'ornate'
  },
  {
    name: 'Culinary Arts Academy Master Chef Honors',
    programName: 'Culinary Arts Academy Professional Master Chef Diploma',
    category: 'Creative & Design',
    theme: 'corporate',
    color: '#064E3B',
    borderColor: '#F59E0B',
    signatory1: 'Gordon Ramsay',
    title1: 'Head of Jury, Culinary Arts Academy',
    sealType: 'gold_medallion',
    decorFlourish: 'minimal'
  },
  {
    name: 'Milan Fashion Institute Apparel Design Cert',
    programName: 'Milan Fashion Academy Certified Apparel Designer Master',
    category: 'Creative & Design',
    theme: 'artistic',
    color: '#BE185D',
    borderColor: '#DB2777',
    signatory1: 'Giorgio Armani',
    title1: 'Director, Milan Fashion Institute',
    sealType: 'modern',
    decorFlourish: 'none'
  },
  {
    name: 'Literary Novel Writing Fellowship Cert',
    programName: 'Global Literary Novel Writing Fellowship Award',
    category: 'Creative & Design',
    theme: 'academic',
    color: '#3F2B1B',
    borderColor: '#78350F',
    signatory1: 'Margaret Atwood',
    title1: 'President, Novelists Fellowship Society',
    sealType: 'crimson_wax',
    decorFlourish: 'ornate'
  },
  {
    name: 'Global UI/UX Design Boot Camp Expert Cert',
    programName: 'Certified Advanced UI/UX Product Design Master',
    category: 'Creative & Design',
    theme: 'tech',
    color: '#F43F5E',
    borderColor: '#4F46E5',
    signatory1: 'Don Norman',
    title1: 'Head Instructor, UIUX Design Boot Camp',
    sealType: 'stellar',
    decorFlourish: 'modern'
  },
  {
    name: 'Creative Painting Fine Arts Master Cert',
    programName: 'Fine Arts Studio Master of Creative Painting & Sketching',
    category: 'Creative & Design',
    theme: 'artistic',
    color: '#A21CAF',
    borderColor: '#F472B6',
    signatory1: 'David Hockney',
    title1: 'Dean, Creative Painting Alliance',
    sealType: 'classic',
    decorFlourish: 'ornate'
  },

  // Health & Wellness (6 presets)
  {
    name: 'Yoga Alliance 200 Hour Teacher Credentials',
    programName: 'Registered Yoga Teacher - 200 Hour (RYT-200)',
    category: 'Health & Wellness',
    theme: 'health_sport',
    color: '#0D9488',
    borderColor: '#14B8A6',
    signatory1: 'Sadhguru Jaggi',
    title1: 'Director, Yoga Alliance Council',
    sealType: 'gold_medallion',
    decorFlourish: 'classic'
  },
  {
    name: 'CrossFit Coach Academy Level 1 Trainer',
    programName: 'CrossFit Level 1 Coach Certification (CF-L1)',
    category: 'Health & Wellness',
    theme: 'health_sport',
    color: '#DC2626',
    borderColor: '#111111',
    signatory1: 'Greg Glassman',
    title1: 'President, CrossFit Certification Board',
    sealType: 'modern',
    decorFlourish: 'none'
  },
  {
    name: 'Boston Marathon Finisher Elite Runner Cert',
    programName: 'Boston Marathon Finisher & Qualifying Runner Credentials',
    category: 'Health & Wellness',
    theme: 'health_sport',
    color: '#1E3A8A',
    borderColor: '#FBBF24',
    signatory1: 'Thomas Grilk',
    title1: 'CEO, Boston Athletic Association',
    sealType: 'gold_medallion',
    decorFlourish: 'minimal'
  },
  {
    name: 'Nutrition Science Diet Specialist Cert',
    programName: 'Certified Sports Nutritionist & Diet Planning Specialist',
    category: 'Health & Wellness',
    theme: 'corporate',
    color: '#15803D',
    borderColor: '#166534',
    signatory1: 'Dr. Michael Greger',
    title1: 'Director, Nutrition Science Academy',
    sealType: 'emerald_shield',
    decorFlourish: 'minimal'
  },
  {
    name: 'Zen Mindfulness Meditation Teacher Cert',
    programName: 'Registered Mindfulness & Vipassana Meditation Instructor',
    category: 'Health & Wellness',
    theme: 'health_sport',
    color: '#1E293B',
    borderColor: '#94A3B8',
    signatory1: 'Jon Kabat-Zinn',
    title1: 'Director, Zen Mindfulness Academy',
    sealType: 'none',
    decorFlourish: 'none'
  },
  {
    name: 'Red Cross Emergency First Aid Responder',
    programName: 'Emergency First Aid, CPR & AED Responder Certification',
    category: 'Health & Wellness',
    theme: 'corporate',
    color: '#B91C1C',
    borderColor: '#B91C1C',
    signatory1: 'Gail McGovern',
    title1: 'CEO, International Red Cross',
    sealType: 'emerald_shield',
    decorFlourish: 'none'
  },

  // Professional Certifications (4 presets)
  {
    name: 'Project Management Professional (PMP)',
    programName: 'Project Management Professional (PMP) Credential',
    category: 'Professional Certifications',
    theme: 'corporate',
    color: '#0A3B5C',
    borderColor: '#E87722',
    signatory1: 'Pierre Le Manh',
    title1: 'President & CEO, PMI Organization',
    sealType: 'stellar',
    decorFlourish: 'minimal'
  },
  {
    name: 'Scrum Alliance Certified ScrumMaster (CSM)',
    programName: 'Certified ScrumMaster (CSM) Program',
    category: 'Professional Certifications',
    theme: 'tech',
    color: '#0F766E',
    borderColor: '#0F766E',
    signatory1: 'Howard Sublett',
    title1: 'Chief Product Owner, Scrum Alliance',
    signatory2: 'Melissa Boggs',
    title2: 'Chief Agile Officer',
    sealType: 'gold_medallion',
    decorFlourish: 'minimal'
  },
  {
    name: 'Certified Info Systems Security (CISSP)',
    programName: 'Certified Information Systems Security Professional (CISSP)',
    category: 'Professional Certifications',
    theme: 'premium_dark',
    color: '#D4AF37',
    borderColor: '#D4AF37',
    signatory1: 'Clar Rosso',
    title1: 'CEO, ISC2 Organization',
    sealType: 'emerald_shield',
    decorFlourish: 'minimal'
  },
  {
    name: 'CFA Chartered Financial Analyst Designation',
    programName: 'Chartered Financial Analyst (CFA) Charterholder',
    category: 'Professional Certifications',
    theme: 'corporate',
    color: '#0B2B5C',
    borderColor: '#0B2B5C',
    signatory1: 'Marg Franklin',
    title1: 'President & CEO, CFA Institute',
    sealType: 'classic',
    decorFlourish: 'classic'
  }
];

// Helper function to build a full template object out of a simple PresetDef
const generateTemplateFromDef = (def: PresetDef, idIndex: number): CertificateTemplate => {
  const id = `temp-preset-${idIndex}`;
  let layout: 'landscape' = 'landscape';
  let backgroundColor = '#FFFFFF';
  let backgroundGradient = 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)';
  let borderStyle: 'solid' | 'double' | 'dashed' | 'ornate' | 'none' = def.borderStyle || 'solid';
  let borderWidth = 4;
  let borderRadius = 0;
  
  if (def.theme === 'academic') {
    backgroundColor = '#FAF8F5';
    backgroundGradient = 'linear-gradient(180deg, #FAF8F5 0%, #F5EFEB 100%)';
    borderWidth = 10;
  } else if (def.theme === 'premium_dark') {
    backgroundColor = '#050B14';
    backgroundGradient = 'radial-gradient(circle, #0F1D33 0%, #03060C 100%)';
    borderWidth = 6;
  } else if (def.theme === 'modern_minimal') {
    backgroundColor = '#FFFFFF';
    backgroundGradient = 'none';
    borderWidth = 0;
    borderStyle = 'none';
  } else if (def.theme === 'artistic') {
    backgroundColor = '#FDFCF7';
    backgroundGradient = 'linear-gradient(135deg, #FFFDF9 0%, #FAF6EE 100%)';
    borderWidth = 2;
  } else if (def.theme === 'health_sport') {
    backgroundColor = '#FCFDFD';
    backgroundGradient = 'linear-gradient(135deg, #FFFFFF 0%, #F4FBF9 100%)';
    borderWidth = 8;
    borderRadius = 8;
  }

  // Choose fonts based on theme
  let fontTitle = 'Space Grotesk';
  let fontBody = 'Inter';
  let fontName = 'Space Grotesk';
  let fontMeta = 'JetBrains Mono';

  if (def.theme === 'academic') {
    fontTitle = 'Playfair Display';
    fontBody = 'Lora';
    fontName = 'Playfair Display';
    fontMeta = 'Libre Baskerville';
  } else if (def.theme === 'artistic') {
    fontTitle = 'Cinzel';
    fontBody = 'Lora';
    fontName = 'Great Vibes';
    fontMeta = 'Cormorant Garamond';
  } else if (def.theme === 'premium_dark') {
    fontTitle = 'Montserrat';
    fontBody = 'Inter';
    fontName = 'Montserrat';
    fontMeta = 'JetBrains Mono';
  } else if (def.theme === 'corporate') {
    fontTitle = 'Inter';
    fontBody = 'Inter';
    fontName = 'Poppins';
    fontMeta = 'JetBrains Mono';
  }

  // Generate text elements based on settings
  const textElements: TextElement[] = [
    {
      id: 't1',
      text: def.name.toUpperCase(),
      fontSize: 12,
      fontFamily: fontTitle,
      fontWeight: 'bold',
      color: def.theme === 'premium_dark' ? '#D4AF37' : def.color,
      xPercent: 50,
      yPercent: 25,
      align: 'center'
    },
    {
      id: 't2',
      text: def.theme === 'academic' ? 'This is to certify that' : (def.theme === 'artistic' ? 'With honor and distinction, it is awarded to' : 'This confirms that'),
      fontSize: 9.5,
      fontFamily: fontBody,
      fontWeight: 'normal',
      color: def.theme === 'premium_dark' ? '#94A3B8' : '#64748B',
      xPercent: 50,
      yPercent: 33,
      align: 'center'
    },
    {
      id: 't3',
      text: '{{name}}',
      fontSize: 32,
      fontFamily: fontName,
      fontWeight: 'bold',
      color: def.theme === 'premium_dark' ? '#FFFFFF' : '#0F172A',
      xPercent: 50,
      yPercent: 44,
      align: 'center',
      isPlaceholder: true
    },
    {
      id: 't4',
      text: def.theme === 'academic' 
        ? 'has met all rigorous requirements and successfully completed the program in' 
        : (def.theme === 'health_sport' ? 'has demonstrated training mastery and met the fitness criteria for' : 'has successfully demonstrated proficiency and met all requirements to be certified as'),
      fontSize: 9.5,
      fontFamily: fontBody,
      fontWeight: 'normal',
      color: def.theme === 'premium_dark' ? '#94A3B8' : '#64748B',
      xPercent: 50,
      yPercent: 52.5,
      align: 'center'
    },
    {
      id: 't5',
      text: '{{program}}',
      fontSize: 19,
      fontFamily: fontTitle,
      fontWeight: 'bold',
      color: def.theme === 'premium_dark' ? '#D4AF37' : def.color,
      xPercent: 50,
      yPercent: 61,
      align: 'center',
      isPlaceholder: true
    },
    {
      id: 't6',
      text: `Credential Reference: {{id}}`,
      fontSize: 8,
      fontFamily: fontMeta,
      fontWeight: 'normal',
      color: def.theme === 'premium_dark' ? '#475569' : '#94A3B8',
      xPercent: 12,
      yPercent: 88,
      align: 'left'
    },
    {
      id: 't7',
      text: `Issued on: {{date}}`,
      fontSize: 8,
      fontFamily: fontMeta,
      fontWeight: 'normal',
      color: def.theme === 'premium_dark' ? '#475569' : '#94A3B8',
      xPercent: 88,
      yPercent: 88,
      align: 'right'
    }
  ];

  const customTemplate: CertificateTemplate = {
    id,
    workspaceId: '',
    name: def.name,
    layout: 'landscape',
    backgroundColor,
    borderColor: def.borderColor,
    borderWidth,
    borderRadius,
    borderStyle,
    backgroundGradient,
    decorFlourish: def.decorFlourish || 'none',
    showSeal: def.sealType !== 'none',
    sealType: def.sealType || 'classic',
    showQrCode: true,
    qrCodeX: 50,
    qrCodeY: 85,
    qrCodeWidth: 32,
    sealWidth: 38,
    logoX: 50,
    logoY: 13,
    logoWidth: 70,
    logoIconType: def.logoIconType,
    signatureX: 25,
    signatureY: 77,
    signatureWidth: 90,
    signatoryName: def.signatory1,
    signatoryTitle: def.title1,
    showSecondarySignatory: !!def.signatory2,
    secondarySignatoryName: def.signatory2,
    secondarySignatoryTitle: def.title2,
    secondarySignatureX: 75,
    secondarySignatureY: 77,
    secondarySignatureWidth: 90,
    textElements
  };

  return customTemplate;
};

// Generate 53 distinct MNC and corporate designs
export const BEAUTIFUL_PRESETS: (CertificateTemplate & { category: string; programName: string })[] = PRESET_DEFINITIONS.map((def, idx) => {
  const template = generateTemplateFromDef(def, idx);
  return {
    ...template,
    category: def.category,
    programName: def.programName
  };
});
