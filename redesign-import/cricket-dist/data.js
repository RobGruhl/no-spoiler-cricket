// No Spoiler Cricket — representative sample data
// Structure is suggestive; Claude Code should adapt field names to the final repo.

window.MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
window.MONTHS_HI = ["जनवरी","फ़रवरी","मार्च","अप्रैल","मई","जून","जुलाई","अगस्त","सितंबर","अक्तूबर","नवंबर","दिसंबर"];

// Format codes used by the .fmt CSS classes:
//   test · odi · t20i · ipl · league · womens
// "disc" is the high-level category for filters (intl / franchise / domestic / women).

window.MATCHES = [
  // ——— April ———
  {id:"ind-aus-test-2", dt:"Apr 22–26", start:"2026-04-22", time:"09:30 IST", month:4,
   vs:"IND vs AUS", vs_hi:"भारत – ऑस्ट्रेलिया",
   series:"Border–Gavaskar Trophy · 2nd Test", fmt:"test", disc:"intl", gender:"m",
   ven:"Feroz Shah Kotla, Delhi", rating:5, ovrs:450, cv:"Star Sports", hot:true,
   tok:"A", tokCol:"red", slug:"ind-aus-test-delhi"},

  {id:"mi-csk",  dt:"Apr 24", start:"2026-04-24", time:"19:30 IST", month:4,
   vs:"MI vs CSK", vs_hi:"मुंबई – चेन्नई",
   series:"IPL · Match 34 · El Clásico", fmt:"ipl", disc:"franchise", gender:"m",
   ven:"Wankhede Stadium", rating:4, ovrs:40, cv:"JioHotstar", tok:"B", tokCol:"green",
   slug:"mi-csk-wankhede"},

  {id:"eng-sa-odi1", dt:"Apr 25", start:"2026-04-25", time:"15:00 BST", month:4,
   vs:"ENG vs SA", vs_hi:"इंग्लैंड – दक्षिण अफ़्रीका",
   series:"Metro Bank ODI · 1 of 3", fmt:"odi", disc:"intl", gender:"m",
   ven:"Lord's, London", rating:4, ovrs:100, cv:"Sky Sports", tok:"C", tokCol:"navy"},

  {id:"indw-nzw-t20i", dt:"Apr 26", start:"2026-04-26", time:"19:00 IST", month:4,
   vs:"IND-W vs NZ-W", vs_hi:"भारत महिला – न्यूज़ीलैंड महिला",
   series:"Women's T20I · 2 of 5", fmt:"womens", disc:"women", gender:"w",
   ven:"M. Chinnaswamy, Bengaluru", rating:3, ovrs:40, cv:"JioHotstar",
   tok:"D", tokCol:"saffron"},

  {id:"rcb-kkr", dt:"Apr 27", start:"2026-04-27", time:"19:30 IST", month:4,
   vs:"RCB vs KKR", vs_hi:"बेंगलुरु – कोलकाता",
   series:"IPL · Match 35", fmt:"ipl", disc:"franchise", gender:"m",
   ven:"M. Chinnaswamy, Bengaluru", rating:3, ovrs:40, cv:"JioHotstar",
   tok:"E", tokCol:"green"},

  {id:"sl-ban-test", dt:"Apr 29 – May 3", start:"2026-04-29", time:"10:00 SLST", month:4,
   vs:"SL vs BAN", vs_hi:"श्रीलंका – बांग्लादेश",
   series:"1st Test · Galle", fmt:"test", disc:"intl", gender:"m",
   ven:"Galle International", rating:3, ovrs:450, cv:"Willow TV", tok:"F", tokCol:"red"},

  // ——— May ———
  {id:"ipl-q1", dt:"May 19", start:"2026-05-19", time:"19:30 IST", month:5,
   vs:"TBC vs TBC", vs_hi:"क्वालिफ़ायर 1",
   series:"IPL Qualifier 1 · Ahmedabad", fmt:"ipl", disc:"franchise", gender:"m",
   ven:"Narendra Modi Stadium", rating:5, ovrs:40, cv:"JioHotstar", hot:true,
   tok:"Q1", tokCol:"green"},

  {id:"ipl-final", dt:"May 24", start:"2026-05-24", time:"19:30 IST", month:5,
   vs:"TBC vs TBC", vs_hi:"आईपीएल फ़ाइनल",
   series:"IPL Final · Kolkata", fmt:"ipl", disc:"franchise", gender:"m",
   ven:"Eden Gardens", rating:5, ovrs:40, cv:"JioHotstar", final:true,
   tok:"F", tokCol:"green", slug:"ipl-final-eden"},

  {id:"eng-pak-test1", dt:"May 28 – Jun 1", start:"2026-05-28", time:"11:00 BST", month:5,
   vs:"ENG vs PAK", vs_hi:"इंग्लैंड – पाकिस्तान",
   series:"1st Test · Edgbaston", fmt:"test", disc:"intl", gender:"m",
   ven:"Edgbaston, Birmingham", rating:4, ovrs:450, cv:"Sky Sports",
   tok:"G", tokCol:"red"},

  // ——— June ———
  {id:"wtc-final", dt:"Jun 11–15", start:"2026-06-11", time:"10:30 BST", month:6,
   vs:"IND vs AUS", vs_hi:"विश्व टेस्ट चैम्पियनशिप फ़ाइनल",
   series:"ICC World Test Championship Final · Lord's", fmt:"test", disc:"intl", gender:"m",
   ven:"Lord's, London", rating:5, ovrs:450, cv:"Star Sports", hot:true, final:true,
   tok:"★", tokCol:"red"},
];

// Sample Test detail
window.TEST_MATCH = {
  slug:"ind-aus-test-delhi",
  name:"India v Australia",
  name_hi:"भारत बनाम ऑस्ट्रेलिया",
  series:"Border–Gavaskar Trophy · 2nd Test of 5",
  fmt:"test", rating:5,
  start:"2026-04-22", end:"2026-04-26", dates:"22–26 April 2026",
  time:"09:30 IST (04:00 GMT)",
  venue:"Feroz Shah Kotla, Delhi",
  capacity:41820,
  pitch:"Red soil, turns from Day 3",
  cv:"Star Sports · JioHotstar",
  tag:"A defining chapter in the oldest rivalry in cricket. Five days that decide the series.",
  squads:[
    {side:"IND", captain:"R. Sharma", stars:[
      {no:18, name:"V. Kohli",      role:"BAT"},
      {no:45, name:"R. Sharma",     role:"BAT / C"},
      {no:5,  name:"R. Jadeja",     role:"ALL"},
      {no:93, name:"J. Bumrah",     role:"BOWL"},
      {no:10, name:"R. Ashwin",     role:"BOWL"},
    ]},
    {side:"AUS", captain:"P. Cummins", stars:[
      {no:30, name:"P. Cummins",    role:"BOWL / C"},
      {no:32, name:"M. Labuschagne", role:"BAT"},
      {no:49, name:"S. Smith",      role:"BAT"},
      {no:23, name:"N. Lyon",       role:"BOWL"},
      {no:63, name:"T. Head",       role:"BAT"},
    ]},
  ],
  keys:[
    "Spin vs. grit — Ashwin and Jadeja on a subcontinent deck.",
    "Cummins's first tour as Test captain in India.",
    "Kohli in front of a home crowd that remembers 2013.",
  ],
  recent:[
    {yr:2024, who:"India",     score:"won 4–1", host:"IND"},
    {yr:2023, who:"Australia", score:"won 2–1", host:"AUS"},
    {yr:2021, who:"India",     score:"won 2–1", host:"AUS"},
    {yr:2020, who:"Australia", score:"drew 1–1", host:"IND"},
  ],
};

// Sample IPL detail
window.IPL_MATCH = {
  slug:"ipl-final-eden",
  name:"IPL Final",
  name_hi:"आईपीएल फ़ाइनल",
  series:"Indian Premier League 2026 · Final",
  fmt:"ipl", rating:5,
  date:"Sunday, 24 May 2026", time:"19:30 IST",
  venue:"Eden Gardens, Kolkata",
  capacity:68000,
  cv:"JioHotstar",
  toss:"TBC",
  favourites:[
    {tag:"MI", name:"Mumbai Indians",    titles:5, form:"★★★★★"},
    {tag:"CSK",name:"Chennai Super Kings",titles:5, form:"★★★★"},
    {tag:"RCB",name:"Royal Challengers B.",titles:1, form:"★★★★"},
    {tag:"GT", name:"Gujarat Titans",     titles:1, form:"★★★"},
  ],
  storylines:[
    "Who punches through 5 titles?",
    "Eden Gardens night — the only IPL final here since 2018.",
    "Impact Player rule in its third season.",
  ],
  lastFive:[
    {yr:2025, who:"Royal Challengers Bengaluru", runnerUp:"Punjab Kings"},
    {yr:2024, who:"Kolkata Knight Riders",        runnerUp:"Sunrisers Hyderabad"},
    {yr:2023, who:"Chennai Super Kings",          runnerUp:"Gujarat Titans"},
    {yr:2022, who:"Gujarat Titans",               runnerUp:"Rajasthan Royals"},
    {yr:2021, who:"Chennai Super Kings",          runnerUp:"Kolkata Knight Riders"},
  ],
};
