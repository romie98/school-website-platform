"""Christiana High School volume-test copy. Fictional, realistic development content."""

from __future__ import annotations

SEED_SOURCE = "christiana-volume-test"


def word_count(text: str) -> int:
    stripped = []
    inside = False
    for ch in text:
        if ch == "<":
            inside = True
            stripped.append(" ")
        elif ch == ">":
            inside = False
        elif not inside:
            stripped.append(ch)
    return len("".join(stripped).split())


def paragraphs_to_html(paragraphs: list[str]) -> str:
    return "\n".join(f"<p>{p}</p>" for p in paragraphs)


def rich_html(
    *,
    lead: str,
    heading: str | None = None,
    paras: list[str] | None = None,
    bullets: list[str] | None = None,
    quote: str | None = None,
    more: list[str] | None = None,
    heading2: str | None = None,
    closing: list[str] | None = None,
) -> str:
    chunks = [f"<p>{lead}</p>"]
    if heading:
        chunks.append(f"<h2>{heading}</h2>")
    for p in paras or []:
        chunks.append(f"<p>{p}</p>")
    if bullets:
        items = "".join(f"<li>{item}</li>" for item in bullets)
        chunks.append(f"<ul>{items}</ul>")
    if quote:
        chunks.append(f"<blockquote><p>{quote}</p></blockquote>")
    if heading2:
        chunks.append(f"<h2>{heading2}</h2>")
    for p in more or []:
        chunks.append(f"<p>{p}</p>")
    for p in closing or []:
        chunks.append(f"<p>{p}</p>")
    return "\n".join(chunks)


HISTORY_SECTIONS: list[tuple[str, list[str]]] = [
    (
        "The Early Years",
        [
            "Christiana High School grew out of a community conviction that the young people of upper Manchester deserved a secondary school close to home. In the decades after Independence, families in Christiana, Spalding, Coleyville and the surrounding districts often sent children long distances for fifth-form work. Parents, church leaders and teachers began to argue that a local high school could keep talent in the community, reduce travel hardship and give students a place where the hills, the market and the classroom belonged to the same story. The idea took shape through meetings in church halls and schoolyards, with notebooks full of names of children who were ready for more than the all-age programme could offer.",
            "When the first cohorts arrived, the campus was modest. Classes met in rooms that had to serve as laboratory, library and assembly hall depending on the hour. Teachers carried boxes of textbooks between buildings. Students from farming households arrived after morning chores, sometimes still smelling of the fields, and sat beside classmates whose parents kept shops in the town square. That mix became a strength. The early staff insisted that uniform, punctuality and spoken English would sit alongside respect for the work that put food on the table. Morning devotion, house meetings and the first inter-class spelling bees established a rhythm that later generations still recognise.",
            "Those founding years were not easy. Water pressure failed in dry months. The playing field flooded after heavy rain. Examination entries had to be walked into Mandeville. Yet the school’s first principals kept a simple promise: every child who entered the gate would be treated as capable of CSEC work and of contributing to Jamaica. Old students from those classes still speak of teachers who marked books by lamplight and of prefects who swept classrooms before first period. The story of Christiana High School begins there — not with marble halls, but with a community that decided its young people were worth the effort.",
        ],
    ),
    (
        "Growth and Development",
        [
            "As enrolment grew, the campus had to grow with it. Additional classroom blocks were added in stages, often after PTA fundraisers, alumni contributions and careful budgeting by the bursar’s office. Science rooms received gas and water lines. A small library moved from a converted storeroom into a dedicated space with wooden shelves built by the industrial arts department. The school badge began to appear on more than exercise books: on sports shirts, on the notice board at the main gate, and on letters that went home to parents at the start of each term.",
            "Curriculum offerings widened as the Ministry of Education’s secondary programme expanded nationwide. Christiana High School introduced additional CSEC subjects, strengthened mathematics and English at the lower school, and began to think seriously about sixth-form pathways. Department heads were appointed not as ceremonial titles but as people responsible for schemes of work, book lists and the quality of teaching. Staff development days, once rare, became a termly expectation. Younger teachers arrived from teachers’ colleges with new methods; veteran colleagues supplied the local knowledge of families, feeder schools and the particular challenges of a rural town that was also a commercial hub.",
            "By the 1990s and early 2000s the school had a fuller identity. Houses competed at sports day. The choir sang at civic functions. The football team travelled to fixtures across Manchester and beyond. A school magazine appeared, then lapsed, then returned whenever a committed English teacher could find a printer. Growth was never only about numbers. It was about whether a student from a small district primary school could walk into fifth form with a timetable that made sense, a counsellor who knew their name, and a chance to sit the same examinations as peers in Kingston and Montego Bay.",
        ],
    ),
    (
        "Expansion of the School Community",
        [
            "Christiana High School has always been larger than its roll. Parents staffed the canteen on sports day, patched costumes for drama, and sat in the hall during consultation evenings that ran past dusk. Shopkeepers in the town donated trophies. Churches lent chairs. Alumni who had gone to Mico, CAST, UWI or overseas returned at Christmas with stories that made sixth-formers sit up straighter. The school learned to treat those relationships as part of education, not as optional extras.",
            "Student leadership developed alongside academic work. Prefects, house captains, club presidents and peer counsellors learned to speak in assembly, to settle disputes before they reached the office, and to represent the school at civic parades. The student council, revived more than once across the decades, became a place where uniform rules, canteen prices and the condition of bathrooms could be raised without fear. Staff did not always agree with the motions, but they learned that a school which listens produces graduates who expect to be heard in workplaces and communities.",
            "The wider Manchester community also shaped daily life. Market days affected attendance. Crop seasons changed who could stay for extra lessons. When roadworks or weather delayed rural buses, first period was adjusted with a patience that city schools might not recognise. Christiana High School’s community is therefore not a slogan. It is the practical network of families, churches, clinics, police, business places and neighbouring schools that make a rural high school possible. Expansion meant more students, yes, but also more people who felt the institution belonged to them.",
        ],
    ),
    (
        "Academic Development",
        [
            "Academic work at Christiana High School has always been measured against national standards: CSEC, later CAPE, and the quieter daily work of literacy and numeracy in Grades 7 to 9. English and mathematics remain the spine of the timetable. Science, business, technical and vocational subjects, modern languages, geography, history and the arts give students different doors into the same building of possibility. Teachers have fought, year after year, for textbooks, laboratory chemicals, past papers and time.",
            "Over time the school built support around the examination years. After-school classes, Saturday sessions in the approach to May/June, and structured revision timetables became familiar. The guidance department began to track not only behaviour but also subject combinations, attendance patterns and the students who were quietly falling behind. Academic achievement assemblies celebrated distinctions, but they also named improvement — the child who moved from a Grade IV to a Grade II, the class that raised its coursework completion rate, the department that met its target for SBA submission.",
            "Christiana High School does not claim a monopoly on excellence in Manchester. It claims something more useful: a culture in which hard work is visible. Students see seniors pinning university letters on a notice board. They hear teachers speak about study skills as seriously as they speak about football. They learn that a rural address is not an excuse. The academic story of the school is therefore a story of systems — schemes of work, department meetings, report days, and the unglamorous marking of books — that allow ordinary students to do uncommon things.",
        ],
    ),
    (
        "Sports and Extracurricular Activities",
        [
            "On the field, Christiana High School found another language for belonging. Football, netball, track and field, cricket and table tennis have all had their seasons of glory and their seasons of rebuilding. Sports day remains one of the great gatherings of the year, with houses in colour, alumni on the banking, and the scent of food from the PTA stalls. A student who struggles with algebra may still learn discipline by turning up for 6:30 a.m. training. A shy Grade 8 child may find a voice as a cheerleader or a recorder of results.",
            "Clubs and societies multiplied as the school grew: debate, 4-H, environmental club, choir, drama, Interact, technology club, and subject associations that rise and fall with the energy of a particular teacher. Performing arts students have staged concerts that filled the hall and sent parents home humming. Visual arts displays at prize-giving remind visitors that a high school is also a studio. These activities are not decorations on an academic cake. They are how many students first practise leadership, time management and public courage.",
            "Inter-school competition taught Christiana High another lesson: the hills can produce athletes and thinkers who stand on any field in the island. When teams travelled, they carried the school’s name into parishes that had barely heard of the campus. When they returned, even after a loss, assembly the next morning treated effort as honourable. Generations of students remember a particular final, a particular relay, a particular debate trophy more vividly than any timetable. That memory is part of the school’s history and part of its future.",
        ],
    ),
    (
        "Technology and Modernisation",
        [
            "Computers arrived at Christiana High School the way they arrived at many Jamaican high schools: a few machines in a locked room, a timetable that allowed each class a slice of the week, and a teacher who had taught herself more than any training course had offered. Students queued to type SBAs. The internet, when it came, was slow and precious. Still, the school understood that digital literacy would soon be as basic as handwriting.",
            "Modernisation has been uneven, as it is everywhere. Some rooms gained projectors; others still depend on chalk. A computer laboratory was refurbished, then outgrown, then refurbished again. Tablets and phones complicated discipline policies even as they opened research possibilities. The COVID-19 years forced teachers and students into WhatsApp groups, printed packages and whatever connectivity a household could manage. Christiana High School learned, sometimes painfully, that technology is not a substitute for relationships, but that a school which ignores it will strand its graduates.",
            "Today the technology story is one of intention rather than perfection. The Information Technology department, the technology club and the administrative office share a common aim: that a Christiana High student can create a document, evaluate a source, submit work on time and understand that a password is a responsibility. Modernisation also means better records, clearer communication with parents, and a website that treats the school as a living institution. The volume of news, events and images now attached to this campus is itself a sign that the school expects to be documented, searched and remembered.",
        ],
    ),
    (
        "Community Involvement",
        [
            "Service has never been an afterthought at Christiana High School. Students have cleaned gullies, visited basic schools, packed care packages, planted trees and stood with community groups after storms. Teachers have marked CXC scripts, served on church boards and coached district teams. The school’s calendar makes room for Jamaica Day, Heritage Week, environmental projects and career conversations with people who work in the town — nurses, farmers, police officers, shop owners, teachers and returning residents.",
            "Partnerships with parents remain the most important community relationship. Consultation evenings, PTA meetings and the quieter phone calls from the guidance office are where trust is built or lost. Christiana High School has learned that a letter home is not enough when a parent works two jobs or lives without reliable transport. Teachers who walk through the market on Saturday and greet students by name are doing community work whether or not it appears in a report. The school’s reputation in Christiana is made in those ordinary encounters as much as in examination lists.",
            "Alumni networks, still informal in places, have begun to organise scholarships, mentoring and small grants for needy students. A graduate who now works in Kingston may pay a CSEC fee. Another may return to speak at career day. These gestures stitch generations together. They also remind present students that the school’s story did not start with them and will not end when they collect their slips. Community involvement, in this telling, is the long conversation between the campus and the town that named it.",
        ],
    ),
    (
        "Preparing Students for the Future",
        [
            "The purpose of a high school in twenty-first-century Jamaica is not mysterious. Students must leave able to sit examinations, speak with courtesy, work in teams, use digital tools, and imagine a life that may include university, HEART/NSTA Trust programmes, entrepreneurship, the public service, the diaspora or work that does not yet have a name. Christiana High School prepares students for that range without pretending that every pathway is identical. Sixth form is one route. Technical and vocational excellence is another. A disciplined school-leaver with five CSEC subjects and a reputation for honesty is also a success.",
            "Preparation happens in classrooms, but it also happens in the way the school handles conflict, lateness, grief and celebration. A student who is taught to apologise well, to try again after a failed test, and to represent the school in a clean uniform has learned something that no syllabus fully captures. Guidance sessions on mental health, career talks, university seminars and leadership workshops are therefore not extras. They are part of a curriculum for adulthood. The school’s leaders have said, repeatedly, that character and scholarship must travel together.",
            "Looking ahead, Christiana High School intends to keep widening opportunity while protecting the habits that made the institution trustworthy: punctuality, respect, care for the campus, and a belief that children from the hills can compete with anyone. The buildings will change. The timetable will change. Technology will change. What should not change is the expectation that a student who enters in Grade 7 can leave with a story of growth that their grandparents would recognise as education. This history, written for the school’s digital home, is not a museum label. It is a charge to the next generation of staff, students and families to keep building.",
        ],
    ),
]


def history_html() -> str:
    chunks: list[str] = [
        "<p>The account below is a long-form institutional narrative prepared for the Christiana High School website. "
        "It is written in the voice of a living school rather than as a claim to every official date and statistic. "
        "Administrators may revise any passage as confirmed records become available.</p>"
    ]
    for heading, paras in HISTORY_SECTIONS:
        chunks.append(f"<h2>{heading}</h2>")
        if heading == "Academic Development":
            chunks.append("<p>" + paras[0] + "</p>")
            chunks.append("<p>" + paras[1] + "</p>")
            chunks.append(
                "<ul>"
                "<li>Strong first-language and literacy support in the lower school</li>"
                "<li>CSEC and CAPE pathways with after-school revision</li>"
                "<li>Technical, vocational and business options beside the sciences</li>"
                "<li>Regular report days and academic achievement assemblies</li>"
                "</ul>"
            )
            chunks.append("<p>" + paras[2] + "</p>")
            continue
        if heading == "Sports and Extracurricular Activities":
            chunks.append("<p>" + paras[0] + "</p>")
            chunks.append(
                "<ul>"
                "<li>Football, netball, track and field, cricket and table tennis</li>"
                "<li>Debate, 4-H, environmental club, choir, drama and technology club</li>"
                "<li>House competition, sports day and performing arts showcases</li>"
                "</ul>"
            )
            chunks.append("<p>" + paras[1] + "</p>")
            chunks.append("<p>" + paras[2] + "</p>")
            continue
        for para in paras:
            chunks.append(f"<p>{para}</p>")
    return "\n".join(chunks)


def history_paragraphs() -> list[str]:
    out = [
        "The account below is a long-form institutional narrative prepared for the Christiana High School website. "
        "It is written in the voice of a living school rather than as a claim to every official date and statistic."
    ]
    for heading, paras in HISTORY_SECTIONS:
        out.append(heading)
        out.extend(paras)
    return out


PRINCIPAL_EXCERPT = (
    "Christiana High School remains committed to academic excellence, discipline and the full development of every student in our care. "
    "We ask students, parents, staff, alumni and community partners to walk with us as we build character and scholarship together."
)

PRINCIPAL_PARAS = [
    "It is my privilege to welcome you to Christiana High School. Whether you are a student collecting a timetable, a parent visiting the website for the first time, a member of staff beginning a new academic year, an alumnus looking back, or a community partner wondering how to help, you are part of the circle that keeps this school honest and ambitious. We exist to form young people who can think clearly, work hard, treat others with respect and serve Jamaica with confidence.",
    "Academic excellence is not a poster on a corridor. It is the daily decision to teach well and to learn well. At Christiana High School we expect students to arrive prepared, to complete assignments, to ask questions when they do not understand, and to sit examinations with integrity. We expect teachers to plan lessons, to mark work in a reasonable time, and to refuse the quiet bargain that rural children should be satisfied with less. Our departments — mathematics, English, science, information technology, business, technical and vocational studies, the humanities and the arts — share one standard: every class should leave a student more capable than it found them.",
    "Discipline, in our tradition, is not humiliation. It is the set of habits that make a large community livable: punctuality, a clean uniform, courtesy in the corridor, silence when a teacher is speaking, and the courage to tell the truth when something has gone wrong. Students who learn those habits here will not be surprised by the expectations of a workplace, a university hall, or a family of their own. We will correct behaviour that damages learning. We will also notice improvement. A school that only punishes has already given up on formation.",
    "Respect travels in every direction. Students respect staff and one another. Staff respect students as persons in the making, not as problems to be processed. The school respects parents as first educators. Parents, we ask you to respect the professional judgements of teachers even when you need to ask hard questions. Our motto, Our Best Jamaica Hope, is a reminder that the country we want is being rehearsed in these classrooms. Rude speech, bullying, gossip and contempt for other people’s work have no place in that rehearsal.",
    "Student development is broader than a grade slip. We want athletes who can lose without bitterness, performers who can stand on a stage, club members who can run a meeting, and prefects who can hold a younger student accountable without cruelty. Guidance and counselling are not reserved for crisis. They are part of how we help adolescents name their gifts, their fears and their next steps. A Christiana High student should leave us knowing how to study, how to apologise, how to lead and how to ask for help.",
    "Technology will keep changing the tools of school. It will not change the need for attention. We are investing in laboratories, computer access and digital skills because our graduates will work in a Jamaica that files, searches and communicates online. We also insist that phones and devices remain servants of learning rather than masters of the classroom. Students must learn to evaluate sources, to protect their privacy, and to produce honest work that is their own. Teachers must keep learning too. A school that freezes its methods while the world moves has already begun to fail its children.",
    "Extracurricular life is not a reward for the already successful. It is a second classroom. Football and netball teach stamina. Debate teaches listening. The garden project teaches patience. Choir and drama teach the body to carry meaning. Community outreach teaches that education is a debt we repay. I encourage every student to belong to something that is not on the examination timetable. I encourage staff to keep sponsoring those spaces even when the marking pile is high. The memories that hold a school together are often made after the last bell.",
    "Partnership with parents is the difference between a school that performs and a school that merely operates. Please come to consultation evenings. Please read the letters. Please ask your child what was learned, not only what was served at lunch. If there is a difficulty, come early, while it is still small enough to solve. The office, the guidance department and the vice principals are here for that conversation. We cannot raise your child for you, and you cannot sit CSEC for them. Between those two truths is the work we share.",
    "To our alumni and community partners: this campus still needs you. Scholarships, internships, guest lectures, tools for the workshops, books for the library and simple presence at sports day all tell present students that their labour is seen. Christiana and the surrounding districts have always educated more people than they could employ. That is not a reason for bitterness. It is a reason to prepare students who can thrive here, in other parishes, and in the wider world without forgetting the hills that trained them.",
    "Preparing students for the future means telling them the truth about the future. Work will demand literacy, numeracy, collaboration and character. Some of our graduates will become nurses, teachers, engineers, farmers with accounts, entrepreneurs, public servants and artists. Some will take winding roads. Our task is to make sure that when opportunity appears, a Christiana High education has not left them speechless. We will keep strengthening CSEC and CAPE preparation, career guidance, sixth-form orientation and the unglamorous routines of attendance and coursework.",
    "I am grateful to the staff who carry this mission when the public is not watching: the teacher who stays for extra lessons, the secretary who finds a file, the groundsman who keeps the campus worthy of visitors, the nurse who notices a child who is unwell, the coach who waits for a late bus. Leadership is a team sport. Vice principals, department heads, the bursar, guidance officers and support staff make the principal’s office possible. I ask the whole staff to keep the tone of this school firm and kind at the same time.",
    "To students, I close with a direct charge. Wear the uniform with pride. Do the homework. Look after the younger ones. Represent us well in town. When you fail a test, return to the work. When you succeed, thank the people who helped you and then set a higher target. Jamaica needs your best, not your leftovers. Christiana High School will walk with you, correct you, celebrate you and send you out. May this year be marked by scholarship, discipline, respect and hope — our best Jamaica hope, practised daily on this campus.",
]


def principal_html() -> str:
    return paragraphs_to_html(PRINCIPAL_PARAS)


def u(photo_id: str, w: int = 1600) -> str:
    return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w={w}&q=80"


PORTRAITS = [
    u("photo-1573496359142-b8d87734a5a2", 800),
    u("photo-1580489944761-15a19d654956", 800),
    u("photo-1472099645785-5658abf4ff4e", 800),
    u("photo-1580894732444-8ecded7900cd", 800),
    u("photo-1560250097-0b93528c311a", 800),
    u("photo-1594744803329-e58b31de8bf5", 800),
    u("photo-1614283233556-f35b0c801304", 800),
    u("photo-1544005313-94ddf0286df2", 800),
    u("photo-1507003211169-0a1dd7228f2d", 800),
    u("photo-1551836022-d5d88e9218df", 800),
    u("photo-1500648767791-00dcc994a43e", 800),
    u("photo-1438761681033-6461ffad8d80", 800),
    u("photo-1547425260-76bcadfb4f2c", 800),
    u("photo-1506794778202-cad84cf45f1d", 800),
    u("photo-1529626455594-4ff0802cfb7e", 800),
    u("photo-1531123897727-8f129e1688ce", 800),
    u("photo-1524504388940-b1c1722653e1", 800),
    u("photo-1508214751196-bcfd4ca60f91", 800),
    u("photo-1519085360753-af0119f7cbe7", 800),
    u("photo-1472099645785-5658abf4ff4e", 800),
    u("photo-1494790108377-be9c29b29330", 800),
    u("photo-1463453091185-61582044d556", 800),
    u("photo-1521119989659-a83eee2680f5", 800),
    u("photo-1544005313-94ddf0286df2", 800),
    u("photo-1580489944761-15a19d654956", 800),
    u("photo-1573497019940-1c28c88b4f3e", 800),
    u("photo-1556157382-97eda2d62296", 800),
    u("photo-1622253692010-333f2da6031d", 800),
    u("photo-1580894732444-8ecded7900cd", 800),
    u("photo-1594824476967-48c8b96434fd", 800),
]


def _bio_short(text: str) -> str:
    return f"<p>{text}</p>"


def _bio_long(paras: list[str]) -> str:
    return paragraphs_to_html(paras)


STAFF: list[dict] = [
    {
        "honorific": "Dr.", "first": "Marsha", "last": "Campbell",
        "role": "Principal", "department": "Administration", "staffType": "Administration",
        "email": "marsha.campbell@christanahigh.com",
        "qualifications": "PhD Educational Leadership; MEd; BEd",
        "administration": True, "featured": True, "order": 1,
        "bio": _bio_long([
            "Dr. Marsha Campbell has spent her career in Jamaican secondary education, moving from classroom teaching in the humanities to senior leadership. She believes a high school in a market town must be both academically serious and deeply local — fluent in CSEC requirements and in the lives of the families who keep shops, farms and clinics around Christiana.",
            "Before her appointment as Principal of Christiana High School, she served as a vice principal and head of department, work that taught her the unglamorous machinery of timetables, staffing and parent meetings. She reads widely in school improvement but insists that the real curriculum is what students experience between the gate and the last bell: the tone of a correction, the speed of returned books, the fairness of a detention.",
            "Colleagues describe her as firm about standards and slow to humiliate. She attends sports fixtures when she can, sits in at performing arts rehearsals, and still teaches the occasional guest lesson so that the office does not become a separate country. In public remarks she returns to three words: scholarship, discipline and hope. Parents will hear those words at orientation; students will meet them in the corridor.",
            "Dr. Campbell’s longer view is generational. She wants a Grade 7 child from a small district primary school to leave sixth form or fifth form able to speak well, calculate honestly, use a computer without fear, and carry the school’s name without shame. That ambition, she says, is not public relations. It is the ordinary work of a Jamaican high school that remembers why it was built.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Andre", "last": "Williams",
        "role": "Vice Principal — Academic Affairs", "department": "Administration", "staffType": "Administration",
        "email": "andre.williams@christanahigh.com",
        "qualifications": "MEd Curriculum; BSc Mathematics Education",
        "administration": True, "featured": True, "order": 2,
        "bio": _bio_short("Mr. Andre Williams oversees curriculum, examination entries and academic intervention. He is known for calm data conversations and for walking classrooms during first period."),
    },
    {
        "honorific": "Mrs.", "first": "Simone", "last": "Brown",
        "role": "Vice Principal — Student Affairs", "department": "Administration", "staffType": "Administration",
        "email": "simone.brown@christanahigh.com",
        "qualifications": "MEd Student Services; BEd",
        "administration": True, "featured": True, "order": 3,
        "bio": paragraphs_to_html([
            "Mrs. Simone Brown holds the student-affairs brief: attendance, uniform, clubs, discipline referrals and the temperature of the campus after lunch. She came to leadership from physical education and still thinks like a coach — routines before speeches.",
            "She works closely with prefects and the guidance department, and she is the person many parents meet first when a difficulty is still small enough to solve. Students say she remembers names. Staff say she answers emails.",
        ]),
    },
    {
        "honorific": "Mrs.", "first": "Natalie", "last": "Clarke",
        "role": "Bursar", "department": "Administration", "staffType": "Administration",
        "email": "natalie.clarke@christanahigh.com",
        "qualifications": "ACCA Level; BSc Accounting",
        "administration": True, "featured": True, "order": 4,
        "bio": _bio_short("Mrs. Natalie Clarke manages school accounts, fee queries and procurement with a preference for clear paper trails and courteous service at the office window."),
    },
    {
        "honorific": "Ms.", "first": "Keisha", "last": "Morgan",
        "role": "Guidance Counsellor", "department": "Guidance", "staffType": "Guidance",
        "email": "keisha.morgan@christanahigh.com",
        "qualifications": "MSc Counselling Psychology; BSc",
        "administration": True, "order": 5,
        "bio": _bio_long([
            "Ms. Keisha Morgan leads the guidance programme at Christiana High School. Her days mix scheduled sessions, sudden crises, career conversations and the slow work of helping a teenager put a name to anxiety. She does not romanticise rural childhood; she knows that silence in a classroom can hide hunger, grief or fear of going home.",
            "She trained in counselling psychology and has worked in both school and community settings. At Christiana High she has pushed for mental-health assemblies that treat well-being as a learning issue, not a private shame. She also sits on the team that reviews Grade 11 subject combinations so that ambition and evidence stay in the same sentence.",
            "Parents find her direct. Students find her hard to fool and harder to shock. She keeps confidentiality with the seriousness the profession requires, and she will still walk a child to the office when safety is at stake. Her office is small; her caseload is not. She survives on lists, supervision and the belief that one good conversation can change a term.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Dwayne", "last": "Thomas",
        "role": "Head of Mathematics", "department": "Mathematics", "staffType": "Teaching Staff",
        "email": "dwayne.thomas@christanahigh.com", "qualifications": "BSc Mathematics; Dip Ed", "order": 10,
        "bio": paragraphs_to_html([
            "Mr. Dwayne Thomas teaches mathematics with a whiteboard full of worked examples and little patience for the myth that the subject is only for a gifted few. He runs the after-school support programme and still coaches a junior football side when the season allows.",
        ]),
    },
    {
        "honorific": "Ms.", "first": "Shanice", "last": "Reid",
        "role": "Head of English", "department": "English", "staffType": "Teaching Staff",
        "email": "shanice.reid@christanahigh.com", "qualifications": "BA English; Dip Ed", "order": 11,
        "bio": _bio_short("Ms. Shanice Reid chairs the English department and directs the school magazine whenever a class produces enough brave writing to fill it."),
    },
    {
        "honorific": "Mr.", "first": "Ricardo", "last": "Johnson",
        "role": "Head of Information Technology", "department": "Information Technology", "staffType": "Teaching Staff",
        "email": "ricardo.johnson@christanahigh.com", "qualifications": "BSc Computing; Dip Ed", "order": 12,
        "bio": paragraphs_to_html([
            "Mr. Ricardo Johnson manages the computer laboratory timetable and the technology club. He treats a working printer as a moral victory and teaches students that a file name is the beginning of professionalism.",
            "He previously worked in a small IT support firm in Mandeville and still talks like someone who has recovered lost coursework at 10 p.m. the night before an SBA deadline.",
        ]),
    },
    {
        "honorific": "Mrs.", "first": "Alicia", "last": "Thompson",
        "role": "Head of Science", "department": "Science", "staffType": "Teaching Staff",
        "email": "alicia.thompson@christanahigh.com", "qualifications": "BSc Biology; Dip Ed", "order": 13,
        "bio": _bio_long([
            "Mrs. Alicia Thompson leads science at Christiana High School with a chemist’s eye for safety and a teacher’s eye for curiosity. She has rebuilt practical work after years when chemicals were scarce, insisting that students should still light a Bunsen burner before they sit CSEC Paper 3.",
            "Her environmental awareness project grew from a Grade 10 field task into a campus-wide habit of measuring, planting and explaining. She writes letters to suppliers, trains lab technicians, and still finds time to judge the science fair with a pencil behind her ear.",
            "Students remember her for the sentence she repeats when an experiment fails: write down what happened, then ask why. That sentence, she believes, is as useful in life as in the laboratory. She lives in the Christiana area and greets former students in the supermarket with questions about university labs and nursing school.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Kemar", "last": "Grant",
        "role": "Teacher of Social Studies", "department": "Social Studies", "staffType": "Teaching Staff",
        "email": "kemar.grant@christanahigh.com", "qualifications": "BA History and Social Studies; Dip Ed", "order": 14,
        "bio": _bio_short("Mr. Kemar Grant teaches social studies and coordinates Heritage Week, complete with exhibitions that spill from the hall into the corridor."),
    },
    {
        "honorific": "Ms.", "first": "Taneisha", "last": "Lewis",
        "role": "Teacher of Business Studies", "department": "Business", "staffType": "Teaching Staff",
        "email": "taneisha.lewis@christanahigh.com", "qualifications": "BSc Management Studies; Dip Ed", "order": 15,
        "bio": paragraphs_to_html([
            "Ms. Taneisha Lewis teaches principles of business and accounts. She likes a tidy ledger and a noisy discussion about whether a school canteen is a firm or a social service.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Omar", "last": "Bennett",
        "role": "Head of Physical Education", "department": "Physical Education", "staffType": "Teaching Staff",
        "email": "omar.bennett@christanahigh.com", "qualifications": "BSc Physical Education", "order": 16,
        "bio": paragraphs_to_html([
            "Mr. Omar Bennett runs PE, sports day logistics and the football programme’s weekday training. He believes fitness is a form of respect for the body God gave you, and he will say so in assembly if the field is left littered.",
        ]),
    },
    {
        "honorific": "Mrs.", "first": "Camille", "last": "Foster",
        "role": "Teacher of Visual Arts", "department": "Visual Arts", "staffType": "Teaching Staff",
        "email": "camille.foster@christanahigh.com", "qualifications": "BFA; Dip Ed", "order": 17,
        "bio": _bio_short("Mrs. Camille Foster teaches visual arts and hangs student work where visitors cannot miss it — including the office corridor."),
    },
    {
        "honorific": "Mr.", "first": "Jermaine", "last": "Powell",
        "role": "Teacher of Performing Arts", "department": "Performing Arts", "staffType": "Teaching Staff",
        "email": "jermaine.powell@christanahigh.com", "qualifications": "BA Theatre Arts; Dip Ed", "order": 18,
        "bio": paragraphs_to_html([
            "Mr. Jermaine Powell directs the annual showcase, teaches drama and coaches public speaking for nervous prefects. Rehearsals run long; excuses run longer; the show still opens.",
            "He trained in Kingston and returned to Manchester because he wanted students who had never seen a professional play to discover they could hold a silence on stage.",
        ]),
    },
    {
        "honorific": "Ms.", "first": "Nadine", "last": "Barrett",
        "role": "Teacher of Technical and Vocational Education", "department": "Technical/Vocational Education", "staffType": "Teaching Staff",
        "email": "nadine.barrett@christanahigh.com", "qualifications": "BEd Industrial Technology", "order": 19,
        "bio": _bio_short("Ms. Nadine Barrett teaches industrial techniques and treats a well-cut joint as a form of scholarship."),
    },
    {
        "honorific": "Mrs.", "first": "Patrice", "last": "Gordon",
        "role": "Teacher of Spanish", "department": "Modern Languages", "staffType": "Teaching Staff",
        "email": "patrice.gordon@christanahigh.com", "qualifications": "BA Spanish; Dip Ed", "order": 20,
        "bio": paragraphs_to_html([
            "Mrs. Patrice Gordon teaches Spanish with songs, market dialogues and a rule that English is a guest in her classroom. She organises the languages display on Jamaica Day.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Christopher", "last": "Haynes",
        "role": "Teacher of Geography", "department": "Geography", "staffType": "Teaching Staff",
        "email": "christopher.haynes@christanahigh.com", "qualifications": "BSc Geography; Dip Ed", "order": 21,
        "bio": _bio_short("Mr. Christopher Haynes takes field sketches seriously and can talk about limestone, rainfall and the Christiana market in one lesson."),
    },
    {
        "honorific": "Ms.", "first": "Renee", "last": "Walters",
        "role": "Teacher of History", "department": "History", "staffType": "Teaching Staff",
        "email": "renee.walters@christanahigh.com", "qualifications": "BA History; Dip Ed", "order": 22,
        "bio": paragraphs_to_html([
            "Ms. Renee Walters teaches Caribbean history and runs the archive of old school magazines. She tells students that memory is a civic skill.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Lamar", "last": "Dixon",
        "role": "Teacher of Mathematics", "department": "Mathematics", "staffType": "Teaching Staff",
        "email": "lamar.dixon@christanahigh.com", "qualifications": "BEd Mathematics", "order": 23,
        "bio": _bio_short("Mr. Lamar Dixon teaches lower-school mathematics and keeps a box of broken calculators he insists on repairing rather than discarding."),
    },
    {
        "honorific": "Mrs.", "first": "Danielle", "last": "Simpson",
        "role": "Teacher of English", "department": "English", "staffType": "Teaching Staff",
        "email": "danielle.simpson@christanahigh.com", "qualifications": "BA Literatures in English; Dip Ed", "order": 24,
        "bio": paragraphs_to_html([
            "Mrs. Danielle Simpson teaches literature and coordinates the debate team’s research nights. She marks in green ink because, she says, red looks like an emergency and most errors are not.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Sean", "last": "Patterson",
        "role": "Teacher of Chemistry", "department": "Science", "staffType": "Teaching Staff",
        "email": "sean.patterson@christanahigh.com", "qualifications": "BSc Chemistry; Dip Ed", "order": 25,
        "bio": _bio_short("Mr. Sean Patterson teaches chemistry and double-checks every practical risk assessment before a class lights a flame."),
    },
    {
        "honorific": "Ms.", "first": "Bianca", "last": "Clarke",
        "role": "Teacher of Information Technology", "department": "Information Technology", "staffType": "Teaching Staff",
        "email": "bianca.clarke@christanahigh.com", "qualifications": "BSc Information Technology", "order": 26,
        "bio": paragraphs_to_html([
            "Ms. Bianca Clarke teaches IT to Grades 8 to 11 and helps staff with password resets she wishes people would write down. She launched the digital skills initiative with the technology club.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Andrew", "last": "Cole",
        "role": "Teacher of Principles of Accounts", "department": "Business", "staffType": "Teaching Staff",
        "email": "andrew.cole@christanahigh.com", "qualifications": "BSc Accounting; Dip Ed", "order": 27,
        "bio": _bio_short("Mr. Andrew Cole teaches accounts and volunteers as assistant treasurer for the PTA when asked, which is often."),
    },
    {
        "honorific": "Ms.", "first": "Kimberly", "last": "Vassell",
        "role": "Administrative Assistant", "department": "Administration", "staffType": "Support Staff",
        "email": "kimberly.vassell@christanahigh.com", "qualifications": "Diploma in Administrative Management", "order": 40,
        "bio": _bio_short("Ms. Kimberly Vassell is the calm centre of the school office: letters, visitors, and the file you were sure was lost."),
    },
    {
        "honorific": "Mrs.", "first": "Yvonne", "last": "McKenzie",
        "role": "Librarian", "department": "Library", "staffType": "Support Staff",
        "email": "yvonne.mckenzie@christanahigh.com", "qualifications": "BEd; Certificate in Library Studies", "order": 41,
        "bio": paragraphs_to_html([
            "Mrs. Yvonne McKenzie runs the library as a classroom with better chairs. New learning resources are her favourite news. Noise is not.",
            "She hosts reading mornings for Grade 7 and keeps a quiet list of students who need a place to sit between the last class and the late bus.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Rohan", "last": "Barrett",
        "role": "Laboratory Technician", "department": "Science", "staffType": "Support Staff",
        "email": "rohan.barrett@christanahigh.com", "qualifications": "Associate Degree in Science Laboratory Technology", "order": 42,
        "bio": _bio_short("Mr. Rohan Barrett prepares practicals, tracks inventory and can find a missing pipette faster than most people can find their keys."),
    },
    {
        "honorific": "Nurse", "first": "Patricia", "last": "Henry",
        "role": "School Nurse", "department": "Student Services", "staffType": "Support Staff",
        "email": "patricia.henry@christanahigh.com", "qualifications": "RN; Certificate in School Health", "order": 43,
        "bio": paragraphs_to_html([
            "Nurse Patricia Henry treats the usual campus ailments and notices the unusual ones. She teaches basic first aid to prefects and keeps an extra box of sanitary supplies without making a speech about it.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Nicholas", "last": "Grant",
        "role": "IT Support Officer", "department": "Information Technology", "staffType": "Support Staff",
        "email": "nicholas.grant@christanahigh.com", "qualifications": "Diploma in Computer Technician Studies", "order": 44,
        "bio": _bio_short("Mr. Nicholas Grant keeps the network, the lab machines and the staff laptops in a state he describes as 'working enough for Monday'."),
    },
    {
        "honorific": "Mrs.", "first": "Alexandra-Marie Elizabeth", "last": "Thompson-Williams",
        "role": "Dean of Discipline, Student Welfare and Community Partnerships",
        "department": "Administration", "staffType": "Administration",
        "email": "alexandra.thompsonwilliams@christanahigh.com",
        "qualifications": "MEd Educational Administration; BEd",
        "administration": True, "order": 6,
        "bio": _bio_long([
            "Mrs. Alexandra-Marie Elizabeth Thompson-Williams holds a portfolio that sits between student affairs and the wider community: discipline with dignity, welfare cases that need more than a detention, and the partnerships that bring mentors onto campus. The long name on her door is a family story; the work behind it is practical.",
            "She began as a history teacher, then moved into pastoral leadership because she was the person other teachers asked to sit with a difficult class. She writes careful letters, chairs restoration meetings, and still teaches one Grade 9 group so that she does not lose the feel of a forty-minute lesson.",
            "On consultation evenings she is often the last person in the hall, talking with a parent who waited because the matter was too tender for the corridor. Students learn that her courtesy is not softness. A broken rule is named. A plan is written. A date is set to review it. That rhythm, she argues, is how a school remains both firm and humane while the roll keeps growing.",
        ]),
    },
    {
        "honorific": "Mr.", "first": "Fitzroy", "last": "Campbell",
        "role": "Teacher of Geography and Tourism", "department": "Geography", "staffType": "Teaching Staff",
        "email": "fitzroy.campbell@christanahigh.com", "qualifications": "BSc Tourism Management; Dip Ed", "order": 28,
        "bio": paragraphs_to_html([
            "Mr. Fitzroy Campbell teaches geography and a tourism elective, using the Christiana market and nearby attractions as living case studies. He is also the staff member most likely to volunteer for a Saturday field trip.",
        ]),
    },
]


assert len(STAFF) == 30
for i, person in enumerate(STAFF):
    person["photo"] = PORTRAITS[i]


LONG_CAPTION = (
    "Christiana High School students and staff gather on the assembly ground after a morning of academic awards, "
    "house cheers and a short cultural item, with parents looking on from the shade of the flowering trees near the main block."
)


IMAGES: list[dict] = [
    {"file": "photo-1580582932707-520aed937b7b", "title": "Classroom discussion", "alt": "Students participating in a classroom discussion at Christiana High School", "category": "Academic", "caption": "Grade 10 students during a morning lesson."},
    {"file": "photo-1532094349884-543bc11b234d", "title": "Science laboratory", "alt": "Students participating in a science laboratory activity", "category": "Academic", "caption": "Practical work in the science laboratory."},
    {"file": "photo-1516321318423-f06f85e504b3", "title": "Computer laboratory", "alt": "Students working in the computer laboratory", "category": "Academic", "caption": "Information Technology class in the computer lab."},
    {"file": "photo-1574629810360-7efbbe195018", "title": "Football training", "alt": "Christiana High football team during training", "category": "Sports", "caption": "Senior footballers at after-school training."},
    {"file": "photo-1461896836934-ffe607ba6851", "title": "Athletics practice", "alt": "Students practising track and field on the school grounds", "category": "Sports", "caption": "Athletes warming up before an inter-school meet."},
    {"file": "photo-1518611012118-696072aa579a", "title": "Netball match", "alt": "Christiana High netball players during a match", "category": "Sports", "caption": "Netball action on the school court."},
    {"file": "photo-1541339907385-03e1d5d0d6c4", "title": "Campus view", "alt": "View of the Christiana High School campus", "category": "Campus Life", "caption": "A quiet stretch of campus between periods."},
    {"file": "photo-1541829070764-84a7d30dea3f", "title": "School buildings", "alt": "School buildings along a campus walkway", "category": "Campus Life", "caption": "Classroom blocks after morning assembly."},
    {"file": "photo-1481627834876-b7833e8f5570", "title": "Library", "alt": "Students reading in the school library", "category": "Academic", "caption": "Quiet study in the library."},
    {"file": "photo-1523050854058-8df90110c9f1", "title": "Graduation", "alt": "Graduating students in gowns at a school ceremony", "category": "Graduation", "caption": "Sixth-form students at graduation."},
    {"file": "photo-1529156069898-49953e39b3ac", "title": "Awards", "alt": "Students receiving awards at prize-giving ceremony", "category": "Special Events", "caption": LONG_CAPTION},
    {"file": "photo-1533174072545-7a4b6ad7a6c3", "title": "Jamaica Day", "alt": "Students in cultural dress during Jamaica Day celebrations", "category": "Special Events", "caption": "Jamaica Day on the assembly ground."},
    {"file": "photo-1552664730-d307ca884978", "title": "Club meeting", "alt": "Students attending a club meeting after school", "category": "Clubs", "caption": "Technology club members planning a showcase."},
    {"file": "photo-1503095396549-807759245b35", "title": "Drama rehearsal", "alt": "Performing arts students rehearsing on stage", "category": "Clubs", "caption": "Rehearsal for the annual showcase."},
    {"file": "photo-1573497019940-1c28c88b4f3e", "title": "Staff meeting", "alt": "Teachers attending professional development session", "category": "Campus Life", "caption": "Staff development in the hall."},
    {"file": "photo-1492684223066-81342ee5ff30", "title": "School assembly", "alt": "Students gathered for morning assembly", "category": "Campus Life", "caption": "Morning assembly under the open sky."},
    {"file": "photo-1551836022-d5d88e9218df", "title": "Career day speaker", "alt": "Guest speaker addressing students on career day", "category": "Special Events", "caption": "A guest professional speaking at Career Day."},
    {"file": "photo-1416879595882-3373a0480b5b", "title": "School garden", "alt": "Students working in the school garden on an environmental project", "category": "Campus Life", "caption": "The garden project after rainfall."},
    {"file": "photo-1511632765486-a01980e01a18", "title": "Community outreach", "alt": "Students participating in a community outreach activity", "category": "Special Events", "caption": "Outreach with a neighbouring basic school."},
    {"file": "photo-1516321497487-e288fb19713f", "title": "Coding workshop", "alt": "Students practising digital skills during a technology workshop", "category": "Academic", "caption": "Digital skills initiative in the computer lab."},
    {"file": "photo-1427504494782-3e7ce9dbafae", "title": "Lecture-style class", "alt": "Students listening during a senior-school lesson", "category": "Academic", "caption": "Sixth-form seminar."},
    {"file": "photo-1522202176988-66273c2fd55f", "title": "Group work", "alt": "Students collaborating on a class project", "category": "Academic", "caption": "Collaborative work in a Grade 11 class."},
    {"file": "photo-1523240795612-9a054b0db644", "title": "Campus students", "alt": "Students walking together on campus", "category": "Campus Life", "caption": "Between bells on a midweek morning."},
    {"file": "photo-1546519638-68e109498ffc", "title": "Indoor sport", "alt": "Students playing indoor sport in the school hall", "category": "Sports", "caption": "Indoor games during PE."},
    {"file": "photo-1612872087720-bb876e2e67d1", "title": "Volleyball", "alt": "Students playing volleyball on campus", "category": "Sports", "caption": "Volleyball practice after school."},
    {"file": "photo-1531415074968-9d331b88c5d5", "title": "Cricket", "alt": "Cricket practice on the school field", "category": "Sports", "caption": "Cricket nets on a Saturday morning."},
    {"file": "photo-1511671782779-c97d3d27a1d4", "title": "Music class", "alt": "Students in a music and performing arts session", "category": "Clubs", "caption": "Choir practice before the Christmas concert."},
    {"file": "photo-1460661419201-fd4cecdf8a8b", "title": "Art studio", "alt": "Visual arts students working on paintings", "category": "Clubs", "caption": "Studio time in visual arts."},
    {"file": "photo-1455390582262-044cdead277a", "title": "Writing workshop", "alt": "Students writing during an English workshop", "category": "Academic", "caption": "English department writing workshop."},
    {"file": "photo-1434030216411-0b793f4b4173", "title": "Examination hall", "alt": "Students seated for a school examination", "category": "Academic", "caption": "Mid-term examinations in the hall."},
    {"file": "photo-1609220136736-443140cff224", "title": "Parents on campus", "alt": "Parents arriving for a school consultation evening", "category": "Special Events", "caption": "Parent-teacher consultation in the evening."},
    {"file": "photo-1506905925346-21bda4d32df4", "title": "Manchester hills", "alt": "Hills surrounding the Christiana community", "category": "Campus Life", "caption": "The hills beyond the campus fence."},
    {"file": "photo-1582719471384-894fbb16e074", "title": "Laboratory bench", "alt": "Science apparatus set out on a laboratory bench", "category": "Academic", "caption": "Apparatus ready for a chemistry practical."},
    {"file": "photo-1562774053-701939374585", "title": "Campus entrance", "alt": "Entrance to a school campus with trees and walkways", "category": "Campus Life", "caption": "Approach to the main buildings."},
    {"file": "photo-1497633762265-9d179a990aa6", "title": "Library shelves", "alt": "Bookshelves in a school library", "category": "Academic", "caption": "New resources on the library shelves."},
    {"file": "photo-1523580494863-6f3031224c94", "title": "Graduation crowd", "alt": "Families attending a graduation ceremony", "category": "Graduation", "caption": "Families at the graduation ceremony."},
    {"file": "photo-1460518451285-97b6aa326961", "title": "Study group", "alt": "Students studying together around a table", "category": "Academic", "caption": "After-school study group."},
    {"file": "photo-1571260899304-425eee4c627c", "title": "Corridor lockers", "alt": "Students in a school corridor between classes", "category": "Campus Life", "caption": "The corridor after second period."},
    {"file": "photo-1503676260728-1c00da094a0b", "title": "Primary outreach", "alt": "Older students reading with younger children", "category": "Special Events", "caption": "Reading session during community outreach."},
    {"file": "photo-1509062522249-198261c909fb", "title": "Teacher at board", "alt": "A teacher explaining work at the classroom board", "category": "Academic", "caption": "Mathematics explanation at the board."},
    {"file": "photo-1577896851231-70ef18881754", "title": "Laboratory goggles", "alt": "Student wearing safety goggles in a science class", "category": "Academic", "caption": "Safety first in the laboratory."},
    {"file": "photo-1517048676732-d65bc937f952", "title": "Staff planning", "alt": "Teachers planning around a meeting table", "category": "Campus Life", "caption": "Department planning meeting."},
    {"file": "photo-1475721027785-f74eccf877e2", "title": "Public speaking", "alt": "A student speaking at a school event", "category": "Clubs", "caption": "Student leader at the leadership workshop."},
    {"file": "photo-1515187029135-18ee286d815b", "title": "Conference seating", "alt": "Rows of chairs prepared for a school conference", "category": "Special Events", "caption": "Hall prepared for a parent and community conference."},
    {"file": "photo-1523580846011-d3a5bc25702b", "title": "Award handshake", "alt": "A student shaking hands while receiving a school award", "category": "Graduation", "caption": "A prize presented on stage."},
    {"file": "photo-1461896836934-ffe607ba6851", "title": "Track lanes", "alt": "Athletes lining up on a running track", "category": "Sports", "caption": "Sports day track events."},
    {"file": "photo-1471295253337-3ceaaedca402", "title": "PE class", "alt": "Physical education class stretching on the field", "category": "Sports", "caption": "Warm-up during physical education."},
    {"file": "photo-1488521787991-ed7bbaae773c", "title": "Service project", "alt": "Students packing supplies for a service project", "category": "Special Events", "caption": "Preparing packages for community service."},
    {"file": "photo-1454165804606-c3d57bc86b40", "title": "Career counselling", "alt": "A student in a career guidance conversation", "category": "Campus Life", "caption": "Guidance conversation about subject choices."},
    {"file": "photo-1556761175-5973dc0f32e7", "title": "Team huddle", "alt": "A school team huddle before a match", "category": "Sports", "caption": "Footballers huddle before kick-off."},
]


assert len(IMAGES) == 50
IMAGES[10]["caption"] = LONG_CAPTION
