/* ============================================================
   G-Cleanser prototype — mock data store
   Branches persist to localStorage; raw datasets are immutable.
   ============================================================ */

const USERS = [
  { id: "u_vishal", name: "Vishal Kapoor",  initials: "VK", role: "Lead consultant", hue: 195, email: "vishal@goongoonalo.com", password: "demo1234" },
  { id: "u_anya",   name: "Anya Rao",        initials: "AR", role: "Data operator",   hue: 68,  email: "anya@goongoonalo.com",   password: "demo1234" },
  { id: "u_dev",    name: "Dev Menon",       initials: "DM", role: "Data operator",   hue: 285, email: "dev@goongoonalo.com",    password: "demo1234" },
];

// Raw datasets — shared, immutable, read-only object storage.
const DATASETS = [
  { id: "pdl1",     name: "PDL Dataset 1", file: "20260429_1511_merged.csv", rows: 5042,  labels: 160, delimiter: "comma", encoding: "UTF-8 (repaired)" },
  { id: "pdl2",     name: "PDL Dataset 2", file: "tracks-13022026.csv",      rows: 48603, labels: 250, delimiter: "comma", encoding: "UTF-8" },
  { id: "manorama", name: "Manorama Music",file: "manorama_catalog.xlsx",    rows: 13177, labels: 1,   delimiter: "comma", encoding: "UTF-8" },
  { id: "svf",      name: "SVF Music",     file: "svf_export.csv",           rows: 1586,  labels: 1,   delimiter: "slash + comma", encoding: "UTF-8" },
  { id: "jivjo",    name: "Jivjo Music",   file: "jivjo.csv",                rows: 182,   labels: 1,   delimiter: "pipe + comma", encoding: "latin-1 → UTF-8" },
];

// Canonical G-Artist reference (subset of the 52) — shared read-only.
const G_ARTISTS = [
  { name: "Sonu Nigam",          variants: [] },
  { name: "Shreya Ghoshal",      variants: [] },
  { name: "Arijit Singh",        variants: ["Arijit S.", "Arjit Singh"] },
  { name: "Shweta Mohan",        variants: ["Swetha Mohan"] },
  { name: "Sunidhi Chauhan",     variants: ["Sunidhi Chowhan", "Sunithy Chouhan"] },
  { name: "Rakesh Chaurasia",    variants: ["Rajesh Chaurasiya"] },
  { name: "Ajay Ashok Gogavale", variants: ["Ajay Gogavale"] },
  { name: "Shankar Mahadevan",   variants: [] },
  { name: "Shaan",               variants: [] },
  { name: "Raju Singh",          variants: [] },
  { name: "Amit Trivedi",        variants: [] },
  { name: "Vishal Dadlani",      variants: [] },
];

// Standard output column order (after standardization).
const COLUMNS = [
  "Record #","ISRC","Album Name","Track Name","Release Date","Singer",
  "Language","Genre","Lyricist","Composer","Label","Go Live Date"
];

// A small, hand-crafted slice of standardized PDL1 records used across screens.
// status: clean | filled | flagged-missing | dup-isrc | similar
const RECORDS = [
  { rec:1,  isrc:"IN7SI2600001", album:"Meera",            track:"Meera",            release:"2026-01-09", singer:"The Sam",            lang:"Hindi",    genre:"Hip-Hop/Rap", lyricist:"The Sam",          composer:"The Sam",            label:"Independent",        golive:"2026-01-12", status:"clean" },
  { rec:2,  isrc:"INS932200439", album:"Bhagwan Bachave",  track:"Kone Khabar",      release:"2023-02-10", singer:"Sonu Nigam",         lang:"Gujarati", genre:"Film",        lyricist:"Milind Gadhavi",   composer:"Bhavesh Shah",       label:"Red Ribbon",         golive:"2023-02-14", status:"clean", gmatch:"Sonu Nigam" },
  { rec:3,  isrc:"INH101245881", album:"Saanjh",           track:"Saanjh",           release:"2025-08-01", singer:"Shweta Mohan",       lang:"Hindi",    genre:"Film",        lyricist:"Irshad Kamil",     composer:"Amit Trivedi",       label:"T-Series",           golive:"2025-08-04", status:"similar", gmatch:"Shweta Mohan" },
  { rec:4,  isrc:"INH101245882", album:"Saanjh",           track:"Saanjh (Reprise)", release:"2025-08-01", singer:"Swetha Mohan",       lang:"Hindi",    genre:"Film",        lyricist:"Irshad Kamil",     composer:"Amit Trivedi",       label:"T-Series",           golive:"2025-08-04", status:"similar", gmatch:"Shweta Mohan" },
  { rec:5,  isrc:"INW182500771", album:"Lehrein",          track:"Lehrein",          release:"2025-03-22", singer:"Sunidhi Chauhan",    lang:"Hindi",    genre:"Pop",         lyricist:"Javed Akhtar",     composer:"Rakesh Chaurasia",   label:"Wave Music",         golive:"2025-03-25", status:"similar", gmatch:"Rakesh Chaurasia" },
  { rec:6,  isrc:"INW182500772", album:"Lehrein",          track:"Lehrein (Live)",   release:"2025-03-22", singer:"Sunidhi Chowhan",    lang:"Hindi",    genre:"Pop",         lyricist:"Javed Akhtar",     composer:"Rajesh Chaurasiya",  label:"Wave Music",         golive:"2025-03-25", status:"similar", gmatch:"Sunidhi Chauhan" },
  { rec:7,  isrc:"INMC02619004", album:"Bihu Bele",        track:"Bihu Bele",        release:"2024-04-13", singer:"Papon",              lang:"Assamese", genre:"Folk",        lyricist:"Papon",            composer:"Papon",              label:"MC Audios & Videos", golive:"2024-04-15", status:"clean" },
  { rec:8,  isrc:"INMC02619004", album:"Bihu Bele",        track:"Bihu Bele",        release:"2024-04-13", singer:"Papon",              lang:"Assamese", genre:"Folk",        lyricist:"Papon",            composer:"Papon",              label:"MC Audios & Videos", golive:"",           status:"dup-isrc" },
  { rec:9,  isrc:"INSO82500233", album:"Raanjhan",         track:"Raanjhan",         release:"2025-06-30", singer:"Shaan",              lang:"Punjabi",  genre:"Film",        lyricist:"Sameer Anjaan",    composer:"Lalit Pandit",       label:"Sonotek",            golive:"2025-07-02", status:"filled", gmatch:"Shaan" },
  { rec:10, isrc:"IND862509103", album:"Didn't Understand",track:"Didn't Understand",release:"2026-01-07", singer:"MUKHALIF | Wick-e",   lang:"Punjabi",  genre:"Indie",       lyricist:"MUKHALIF | Wick-e",composer:"MUKHALIF | Wick-e",  label:null,                 golive:"",           status:"flagged-missing" },
  { rec:11, isrc:"INSR72500188", album:"Megh Mallar",      track:"Megh Mallar",      release:"2025-09-09", singer:"Shankar Mahadevan",  lang:"Marathi",  genre:"Classical",   lyricist:"Prasoon Joshi",    composer:"Shankar Mahadevan",  label:"Sarthak Music",      golive:"2025-09-12", status:"clean", gmatch:"Shankar Mahadevan" },
  { rec:12, isrc:"INWE52500640", album:"Dhol Baje",        track:"Dhol Baje",        release:"2025-11-01", singer:"Ajay Ashok Gogavale",lang:"Marathi",  genre:"Film",        lyricist:"Guru Thakur",      composer:"Ajay-Atul",          label:"Wings Entertainment",golive:"2025-11-05", status:"clean", gmatch:"Ajay Ashok Gogavale" },
];

// Human-review queue (confidence 80–94, plus a same-ISRC conflict).
const REVIEW_PAIRS = [
  { id:"rv1", type:"similar-artist", field:"Singer", score:96, affected:14,
    a:{ value:"Shweta Mohan", records:[3] }, b:{ value:"Swetha Mohan", records:[4] },
    note:"Known cross-dataset variant. High confidence." },
  { id:"rv2", type:"similar-artist", field:"Singer", score:90, affected:2,
    a:{ value:"Sunidhi Chauhan", records:[5] }, b:{ value:"Sunidhi Chowhan", records:[6] },
    note:"Likely same singer — minor spelling variation." },
  { id:"rv3", type:"similar-composer", field:"Composer", score:84, affected:2,
    a:{ value:"Rakesh Chaurasia", records:[5] }, b:{ value:"Rajesh Chaurasiya", records:[6] },
    note:"Low–medium confidence. Could be different people — check carefully." },
  { id:"rv4", type:"dup-isrc", field:"ISRC", score:null, affected:2,
    a:{ value:"Rec 7 · Go Live 2024-04-15", records:[7] }, b:{ value:"Rec 8 · Go Live (null)", records:[8] },
    note:"Same ISRC & album. Same UPC. Rec 7 has more complete fields → keep Rec 7, delete Rec 8." },
  { id:"rv5", type:"similar-artist", field:"Lyricist", score:82, affected:3,
    a:{ value:"Sameer Anjaan", records:[9] }, b:{ value:"Sameer Anjan", records:[] },
    note:"Borderline. Surfaced for awareness." },
];

function commits(list) { return list; }

// ---- Uploadable sample files (simulate user's local files) ----
const FILE_LIBRARY = [
  { id:"f_merged", file:"20260429_1511_merged.csv", ext:"csv", size:"1.9 MB", bytes:1992294, rows:5042, error:null,
    columns:["ISRC","UPC","Album cat. No.","Album Name","Track Name","Release Date","Artist Name","Audio Duration","Language","Genre","Lyric Writer","Composer","Territory Rights","Go Live Date","Label"] },
  { id:"f_tracks", file:"tracks-13022026.csv", ext:"csv", size:"17.4 MB", bytes:18244403, rows:48603, error:null,
    columns:["ISRC","UPC","Title","Album","Primary Artists","Featuring","Duration (s)","Lang","Genre","Writers","Music By","Record Label","Release Date"] },
  { id:"f_jivjo", file:"jivjo.csv", ext:"csv", size:"64 KB", bytes:65536, rows:182, error:null,
    columns:["ISRC","Song","Album","Singer","Lyricist","Composer","Language","Label"] },
  { id:"f_svf", file:"svf_export.csv", ext:"csv", size:"612 KB", bytes:626688, rows:1586, error:null,
    columns:["ISRC","Album Name","Track Name","Singer","Composer","Lyricist","Genre","Label","Go Live Date"] },
  { id:"f_zero", file:"manorama_partial.csv", ext:"csv", size:"0 KB", bytes:0, rows:0, error:"Empty file — 0 KB. Nothing to read." },
  { id:"f_big", file:"manorama_full_catalog.xlsx", ext:"xlsx", size:"34 MB", bytes:35651584, rows:90112, error:"Exceeds the 20 MB per-file limit." },
  { id:"f_corrupt", file:"radio_logs_q1.xlsx", ext:"xlsx", size:"4.2 MB", bytes:4404019, rows:0, error:"File is corrupted — could not be parsed." },
];
const MAX_BYTES = 20 * 1024 * 1024;

// ---- Cleaning presets: each defines output columns + rules ----
const PRESETS = {
  "Metadata (PDL)":             { tag:"Music",      desc:"Standard PDL music-catalog metadata.",   columns:["Album Name","Track Name","Release Date","Singer","Language","Genre","Lyricist","Composer","Label","Go Live Date"], rules:["Split multi-value Artist / Composer / Lyricist into N columns","Normalize all dates → YYYY-MM-DD","Lead Artist = all contributors, pipe-joined","Dedup on ISRC + UPC + Album Name"] },
  "Music Rights Catalog":       { tag:"Rights",     desc:"Ownership, splits & territory.",          columns:["Track Name","Composer","Lyricist","Publisher","Territory","Royalty Split %"], rules:["Validate ISRC checksum","Normalize ownership % to total 100","Flag missing territory rights","Concatenate writer share rows"] },
  "Artist Master Data":         { tag:"Artist",     desc:"De-duplicated talent master.",            columns:["Artist Name","Aliases","Primary Role","Track Count","Primary Genre"], rules:["Merge spelling variants → canonical name","Roll up alias list","Count tracks per artist","Match against the G-Artist list"] },
  "Video Metadata":             { tag:"Video",      desc:"Music-video & visual assets.",            columns:["Title","Director","Duration","Resolution","Release Date","Language"], rules:["Normalize duration → HH:MM:SS","Standardize resolution labels","Validate file references","Dedup on ISRC / ISVN"] },
  "OTT Content Metadata":       { tag:"OTT",        desc:"Streaming platform delivery.",            columns:["Title","Content Type","Season / Episode","Genre","Maturity Rating","Language","Run Time"], rules:["Map content-type vocabulary","Normalize maturity ratings","Validate episode numbering","Fill language from reference"] },
  "Podcast Metadata":           { tag:"Podcast",    desc:"Episodes & shows.",                       columns:["Episode Title","Show Name","Host","Duration","Publish Date","Category"], rules:["Normalize duration","Roll episodes under their show","Standardize category taxonomy","Strip HTML from descriptions"] },
  "Radio Content Metadata":     { tag:"Radio",      desc:"Broadcast play logging.",                 columns:["Track Name","Artist","Air Date","Time Slot","Station","Duration"], rules:["Normalize air date & time","Map station codes","Validate slot durations","Dedup repeat plays"] },
  "Publishing Catalog Metadata":{ tag:"Publishing", desc:"Works & compositions.",                   columns:["Work Title","Writers","Publisher","IPI / CAE","ISWC","Share %"], rules:["Validate ISWC format","Normalize writer / publisher splits","Link recordings (ISRC) to works (ISWC)","Flag unmatched shares"] },
  "Custom":                     null,
};
const PRESET_ORDER = ["Metadata (PDL)","Music Rights Catalog","Artist Master Data","Video Metadata","OTT Content Metadata","Podcast Metadata","Radio Content Metadata","Publishing Catalog Metadata","Custom"];

// Map output column name → record field (for rendering the master).
const FIELD_MAP = {
  "ISRC":"isrc","UPC":"isrc","Album Name":"album","Album":"album","Album cat. No.":"album",
  "Track Name":"track","Track":"track","Song":"track","Title":"track","Work Title":"track","Episode Title":"track",
  "Release Date":"release","Release":"release","Publish Date":"release","Air Date":"release",
  "Singer":"singer","Artist":"singer","Artist Name":"singer","Primary Artists":"singer","Host":"singer",
  "Language":"lang","Lang":"lang","Genre":"genre","Primary Genre":"genre","Category":"genre",
  "Lyricist":"lyricist","Writers":"lyricist","Lyric Writer":"lyricist",
  "Composer":"composer","Music By":"composer","Director":"composer",
  "Label":"label","Record Label":"label","Publisher":"label","Station":"label","Show Name":"album",
  "Go Live Date":"golive","Duration":"golive","Run Time":"golive",
};

// ---- Flat review rows: every record with confidence < 100 (or a conflict). ----
const REVIEW_ROWS = [
  { id:"w1", rec:4,  isrc:"INH101245882", track:"Saanjh (Reprise)", field:"Singer",   value:"Swetha Mohan",       suggested:"Shweta Mohan",     confidence:96, issue:"Similar to “Shweta Mohan” (96%)" },
  { id:"w2", rec:6,  isrc:"INW182500772", track:"Lehrein (Live)",   field:"Singer",   value:"Sunidhi Chowhan",    suggested:"Sunidhi Chauhan",  confidence:90, issue:"Similar artist spelling (90%)" },
  { id:"w3", rec:6,  isrc:"INW182500772", track:"Lehrein (Live)",   field:"Composer", value:"Rajesh Chaurasiya",  suggested:"Rakesh Chaurasia", confidence:84, issue:"Similar composer (84%) — check" },
  { id:"w4", rec:8,  isrc:"INMC02619004", track:"Bihu Bele",        field:"(record)", value:"Go Live = null",     suggested:"Delete — dup of Rec 7", confidence:null, issue:"Duplicate ISRC, same album as Rec 7" },
  { id:"w5", rec:10, isrc:"IND862509103", track:"Didn't Understand",field:"Label",    value:null,                  suggested:"— no ISRC match",  confidence:0,  issue:"Missing label, no reference match" },
  { id:"w6", rec:9,  isrc:"INSO82500233", track:"Raanjhan",         field:"Lyricist", value:"Sameer Anjan",        suggested:"Sameer Anjaan",    confidence:82, issue:"Borderline name variant (82%)" },
  { id:"w7", rec:3,  isrc:"INH101245881", track:"Saanjh",           field:"Singer",   value:"Shweta Mohan",        suggested:"Shweta Mohan",     confidence:97, issue:"Variant cluster with Rec 4" },
  { id:"w8", rec:5,  isrc:"INW182500771", track:"Lehrein",          field:"Composer", value:"Rakesh Chaurasia",    suggested:"Rakesh Chaurasia", confidence:88, issue:"Variant cluster with Rec 6" },
];

const BRANCHES = [
  {
    id:"b_pdl1_vishal", owner:"u_vishal", dataset:"pdl1", name:"PDL1 cleanse",
    status:"awaiting-review", created:"2026-04-29", updated:"2026-06-02",
    files:[{ id:"f_merged", file:"20260429_1511_merged.csv", size:"1.9 MB", rows:5042 }],
    primaryKey:"ISRC", preset:"Metadata (PDL)", customColumns:null,
    rowsIn:5042, rowsOut:4780, deleted:262, gMatches:6,
    pipeline:{ done:true, step:7 },
    flaggedRows:["w1","w2","w3","w4","w5","w6","w7","w8"], review:{ edits:{}, deleted:[], submitted:false },
    commits:commits([
      { id:"#a1", kind:"upload",  label:"Uploaded 20260429_1511_merged.csv", at:"2026-04-29 15:11" },
      { id:"#a2", kind:"auto",    label:"Auto-clean pass · 5,042 rows standardized", at:"2026-04-29 15:18" },
      { id:"#a3", kind:"auto",    label:"ISRC fill · 318 rows enriched, 41 flagged", at:"2026-04-29 15:19" },
      { id:"#a4", kind:"auto",    label:"Duplicate scan · 8 rows below 100 confidence", at:"2026-04-29 15:21" },
    ]),
  },
  {
    id:"b_pdl2_anya", owner:"u_anya", dataset:"pdl2", name:"PDL2 cleanse",
    status:"running", created:"2026-06-03", updated:"2026-06-04",
    files:[{ id:"f_tracks", file:"tracks-13022026.csv", size:"17.4 MB", rows:48603 }],
    primaryKey:"ISRC", preset:"Music Rights Catalog", customColumns:null,
    rowsIn:48603, rowsOut:null, deleted:null, gMatches:37,
    pipeline:{ done:false, step:4 },
    flaggedRows:[], review:{ edits:{}, deleted:[], submitted:false },
    commits:commits([
      { id:"#b1", kind:"upload", label:"Uploaded tracks-13022026.csv", at:"2026-06-03 09:02" },
      { id:"#b2", kind:"auto",   label:"Auto-clean pass · 48,603 rows", at:"2026-06-03 09:40" },
      { id:"#b3", kind:"decision", label:"Decided: Arijit Singh = Arjit Singh → Same", at:"2026-06-03 11:15" },
    ]),
  },
  {
    id:"b_manorama_dev", owner:"u_dev", dataset:"manorama", name:"Manorama cleanse",
    status:"sealed", created:"2026-03-12", updated:"2026-03-28",
    files:[{ id:"f_man", file:"manorama_catalog.xlsx", size:"4.4 MB", rows:13177 }],
    primaryKey:"ISRC", preset:"Artist Master Data", customColumns:null,
    rowsIn:13177, rowsOut:13177, deleted:0, gMatches:9,
    pipeline:{ done:true, step:7 },
    flaggedRows:[], review:{ edits:{}, deleted:[], submitted:true },
    commits:commits([
      { id:"#c1", kind:"upload", label:"Uploaded manorama_catalog.xlsx", at:"2026-03-12 10:30" },
      { id:"#c2", kind:"auto",   label:"Auto-clean + ISRC fill", at:"2026-03-12 11:05" },
      { id:"#c3", kind:"decision", label:"209 LW spelling decisions applied", at:"2026-03-20 14:00" },
      { id:"#c4", kind:"seal",   label:"Master sealed · 13,177 rows · 0 deleted", at:"2026-03-28 16:42" },
    ]),
  },
  {
    id:"b_svf_vishal", owner:"u_vishal", dataset:"svf", name:"SVF cleanse",
    status:"sealed", created:"2026-04-01", updated:"2026-04-09",
    files:[{ id:"f_svf", file:"svf_export.csv", size:"612 KB", rows:1586 }],
    primaryKey:"ISRC", preset:"Metadata (PDL)", customColumns:null,
    rowsIn:1586, rowsOut:1585, deleted:1, gMatches:0,
    pipeline:{ done:true, step:7 },
    flaggedRows:[], review:{ edits:{}, deleted:[], submitted:true },
    commits:commits([
      { id:"#d1", kind:"upload", label:"Uploaded svf_export.csv", at:"2026-04-01 12:00" },
      { id:"#d2", kind:"auto",   label:"Auto-clean · UPC empty → album-name rule", at:"2026-04-01 12:30" },
      { id:"#d3", kind:"decision", label:"Rec 1495 deleted (same album as 1496)", at:"2026-04-06 09:10" },
      { id:"#d4", kind:"seal",   label:"Master sealed · 1,585 rows · 1 deleted", at:"2026-04-09 17:20" },
    ]),
  },
];

// talent summary derived from RECORDS roles
function buildTalent() {
  var map = {};
  function add(name, role) {
    if (!name) return;
    name.split(" | ").forEach(function (n) {
      n = n.trim(); if (!n) return;
      var k = n + "|" + role;
      if (!map[k]) map[k] = { name:n, role:role, tracks:0 };
      map[k].tracks++;
    });
  }
  RECORDS.forEach(function (r) {
    if (r.status === "dup-isrc") return;
    add(r.singer, "Singer"); add(r.lyricist, "Lyric writer"); add(r.composer, "Composer");
  });
  return Object.keys(map).map(function (k) { return map[k]; })
    .sort(function (a, b) { return b.tracks - a.tracks || a.name.localeCompare(b.name); });
}

export const CD = {
  USERS, DATASETS, G_ARTISTS, COLUMNS,
  RECORDS, REVIEW_PAIRS, BRANCHES,
  FILE_LIBRARY, MAX_BYTES, PRESETS, PRESET_ORDER,
  FIELD_MAP, REVIEW_ROWS,
  buildTalent,
  user: function (id) { return USERS.find(function (u) { return u.id === id; }); },
  dataset: function (id) { return DATASETS.find(function (d) { return d.id === id; }); },
  reviewPair: function (id) { return REVIEW_PAIRS.find(function (p) { return p.id === id; }); },
  reviewRow: function (id) { return REVIEW_ROWS.find(function (r) { return r.id === id; }); },
  libFile: function (id) { return FILE_LIBRARY.find(function (f) { return f.id === id; }); },
  STORAGE_KEY: "gcleanser_proto_v1",
};

export default CD;
