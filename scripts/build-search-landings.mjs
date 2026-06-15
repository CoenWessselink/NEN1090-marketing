import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const base = 'https://weldinspectpro.com';
const date = '2026-06-13';

const pages = [
  {
    route: '/en-1090-software', lang: 'en',
    title: 'EN 1090 software for weld inspection and CE dossier workflows | WeldInspect Pro',
    description: 'Connect weld inspections, WPS/WPQR context, material evidence and CE dossier preparation in one structured EN 1090 documentation workflow.',
    h1: 'EN 1090 software for connected weld inspection documentation',
    kicker: 'EN 1090 documentation workflow',
    intro: 'EN 1090 projects create a continuous documentation task, not a final-week filing exercise. WeldInspect Pro gives steel construction, QA/QC and welding coordination teams a shared place for project records, welds, inspections, evidence, procedure references and dossier preparation.',
    image: 'product-ce-dossier-readiness.svg',
    alt: 'EN 1090 software overview with weld inspection evidence and dossier status',
    alternate: '/nl/en-1090-software',
    sections: [
      ['Why EN 1090 documentation becomes difficult to control', ['Project information often grows across spreadsheets, shared drives, paper forms and email threads.', 'A change to a weld, drawing or inspection can leave several disconnected versions in circulation.', 'A connected record helps the team see current status without treating software as the authority on conformity.']],
      ['Project, weld, inspection, evidence and dossier context', ['A project record provides the scope in which weld numbers, inspection moments and supporting documents belong.', 'Each finding can remain linked to the relevant weld and the evidence captured at that moment.', 'This reduces reconstruction work when QA/QC reviews completeness or prepares a handover.']],
      ['WPS/WPQR and material traceability', ['Procedure references are most useful when they remain visible beside the weld records that use them.', 'Material certificates, heat numbers and related evidence can be organised around the same project context.', 'Qualified personnel still determine whether references, qualifications and records are suitable.']],
      ['CE dossier readiness during execution', ['Dossier preparation starts while fabrication and inspection are taking place.', 'Teams can review missing documents, unresolved findings and unlinked evidence before delivery pressure peaks.', 'The resulting overview supports a structured handover without promising approval or certification.']],
      ['What WeldInspect Pro supports', ['The platform supports project setup, weld registers, inspection records, photo evidence, document links, status review and reporting.', 'It helps different roles work from the same record instead of maintaining parallel lists.', 'Demo and trial routes allow teams to evaluate the workflow with their own responsibilities in mind.']],
      ['What remains the responsibility of qualified personnel', ['Software can organise information but cannot interpret every project requirement or accept work on behalf of responsible people.', 'Welding coordinators, inspectors, notified or certification bodies and other authorised parties retain their formal roles.', 'Current contract documents and official standard texts remain the source for requirements.']],
      ['Frequently asked questions', ['The questions below address implementation, records, responsibility and project use.', 'They describe practical workflow support and avoid replacing professional judgement.', 'A product demonstration can explore how the structure fits an existing quality system.']]
    ],
    faqs: [
      ['Does WeldInspect Pro make an EN 1090 conformity decision?', 'No. It organises documentation workflows and records. Qualified personnel and relevant formal parties remain responsible for review, acceptance, certification and conformity decisions.'],
      ['Can inspections and evidence be linked to individual welds?', 'Yes. Weld records can provide the context for inspection status, findings, photos, documents and follow-up actions.'],
      ['Can teams prepare CE dossier information during execution?', 'Yes. The workflow is designed to make completeness and open points visible while the project is active.']
    ],
    related: ['/weld-inspection-software', '/ce-dossier-software', '/wps-wpqr-software', '/platform']
  },
  {
    route: '/weld-inspection-software', lang: 'en',
    title: 'Weld inspection software for QA/QC and steel construction teams | WeldInspect Pro',
    description: 'Record weld inspections, findings, photos, evidence and open actions in a connected workflow for QA/QC and steel construction projects.',
    h1: 'Weld inspection software that keeps records, evidence and actions connected',
    kicker: 'Connected inspection records',
    intro: 'Weld inspection work is easier to review when the inspection record, weld identity, photos, findings and follow-up actions stay together. WeldInspect Pro supports a project-based workflow for inspectors, QA/QC teams and welding coordinators.',
    image: 'product-inspection-record.svg', alt: 'Weld inspection software overview with weld status and evidence',
    alternate: '/nl/lasinspectie-software',
    sections: [
      ['Record inspections while work is visible', ['Field observations are clearest at the moment the weld and surrounding work can still be examined.', 'Inspectors can record status, notes and evidence without postponing administration until the end of a shift.', 'The project keeps a clearer chronology for later review.']],
      ['Link welds, findings, photos and open actions', ['A finding without weld context creates extra questions for production and QA/QC.', 'Linking the record to a weld number, photo and responsible follow-up action makes the next step explicit.', 'Closed and unresolved items remain distinguishable throughout the project.']],
      ['Review status and documentation completeness', ['Reviewers need more than a total count of completed checks.', 'They need to see missing evidence, pending actions and records that still require qualified assessment.', 'A shared overview supports prioritisation without automating acceptance.']],
      ['Replace spreadsheet-based inspection follow-up', ['Spreadsheets can list welds but become fragile when photos, revisions, comments and multiple reviewers are involved.', 'Separate file names and email messages make evidence harder to verify.', 'A structured platform keeps the relationships visible and reduces duplicate administration.']],
      ['Mobile and project-based workflow', ['Inspectors can use a phone, tablet or desktop according to the working environment.', 'Records created in the field remain available to office-based QA/QC and coordination roles.', 'The same project context continues into reporting and handover preparation.']],
      ['From inspection record to reporting', ['Reports are more useful when they are based on maintained project records rather than a separate end-stage summary.', 'Teams can review what is complete and which evidence still needs attention.', 'This creates a more controlled route from inspection activity to documentation output.']],
      ['Frequently asked questions', ['Common questions concern mobile use, photo evidence and the difference between recording and formal acceptance.', 'WeldInspect Pro supports the record and review workflow.', 'Qualified people remain responsible for technical decisions.']]
    ],
    faqs: [
      ['Can weld inspectors use the software on a tablet?', 'Yes. The responsive web workflow supports common desktop, tablet and mobile screen sizes.'],
      ['Does the software replace a qualified weld inspector?', 'No. It supports recording, evidence and follow-up; qualified personnel remain responsible for inspection decisions and acceptance.'],
      ['Can photos and open actions remain linked to a weld?', 'Yes. Keeping these elements in one project context is a central part of the workflow.']
    ],
    related: ['/weld-inspection-app', '/welding-inspection-checklist', '/en-1090-software', '/platform']
  },
  {
    route: '/weld-inspection-app', lang: 'en',
    title: 'Weld inspection app for field inspection records | WeldInspect Pro',
    description: 'Capture weld inspection records, photos, findings and open actions in the field, then keep QA/QC review connected to the project.',
    h1: 'Weld inspection app for field records, photos and review follow-up',
    kicker: 'Field inspection workflow',
    intro: 'A weld inspection app should remove duplicate note-taking without removing professional control. WeldInspect Pro lets field teams capture observations and evidence in project context, while reviewers retain a clear view of follow-up and responsibility.',
    image: 'product-mobile-inspection.svg', alt: 'Weld inspection app showing a mobile inspection record and photo evidence',
    alternate: '/nl/las-controle-app',
    sections: [
      ['Mobile inspection workflow', ['The field workflow starts from the project and weld that are being inspected.', 'This gives each entry a clear identity before notes and evidence are added.', 'Responsive screens keep core actions usable on phones and tablets.']],
      ['Capture photos, findings and weld context', ['Photos are more valuable when the team can see why they were captured and which weld they concern.', 'Findings, comments and status can be stored alongside that context.', 'Reviewers no longer need to match an image folder to a separate spreadsheet by hand.']],
      ['Keep inspection evidence connected', ['Evidence may include photos, supporting files, inspection notes and references to relevant documents.', 'Keeping those items together makes later review more efficient.', 'It also preserves project history when responsibilities move between team members.']],
      ['Open action follow-up', ['Not every observation can be resolved immediately in the field.', 'Open actions make ownership and current status visible for production and QA/QC.', 'The record can show progress without presenting an unresolved item as accepted.']],
      ['QA/QC review', ['Office-based reviewers can examine the same weld, finding and evidence context captured by the field team.', 'Questions can focus on the actual record rather than on locating files.', 'Formal acceptance remains a deliberate action by authorised people.']],
      ['When a field app adds value', ['The strongest use case is a team that currently rewrites paper notes or moves phone photos into folders after the shift.', 'A connected app reduces that handling and supports consistent records across projects.', 'A demo can be used to compare the workflow with current inspection practice.']],
      ['Frequently asked questions', ['Teams often ask about devices, connectivity expectations and review roles.', 'The answers below focus on practical record handling.', 'Project procedures should determine how the app is used in each environment.']]
    ],
    faqs: [
      ['Is WeldInspect Pro a native phone app?', 'WeldInspect Pro provides a responsive web workflow designed for current desktop, tablet and mobile browsers.'],
      ['Can field photos be attached to the correct weld?', 'Yes. The workflow is designed to retain weld and project context around captured evidence.'],
      ['Who closes an open inspection action?', 'The responsible person or authorised reviewer follows the project procedure; the software records status but does not make the technical decision.']
    ],
    related: ['/weld-inspection-software', '/welding-inspection-checklist', '/weld-inspection-tools', '/contact']
  },
  {
    route: '/weld-inspection-tools', lang: 'en',
    title: 'Weld inspection tools for documentation and traceability | WeldInspect Pro',
    description: 'Use connected digital weld inspection tools for weld registers, inspection records, evidence, WPS/WPQR context, reports and handover.',
    h1: 'Digital weld inspection tools for structured project documentation',
    kicker: 'Practical digital tools',
    intro: 'Digital weld inspection tools are most effective when they share one project context. WeldInspect Pro connects the register, inspection record, evidence, procedure references and reporting preparation instead of adding another isolated file.',
    image: 'product-project-overview.svg', alt: 'Digital weld inspection tools with project records and traceability',
    sections: [
      ['Digital tools versus loose files', ['A collection of spreadsheets, photo folders and document forms can digitise individual tasks without connecting them.', 'The team still spends time checking identifiers and versions.', 'A project-based toolset preserves relationships between the records.']],
      ['Weld register', ['The weld register provides a consistent identity for inspection and documentation activity.', 'Status, location and relevant context can be reviewed from the project structure.', 'This makes it easier to identify records that need attention.']],
      ['Inspection records', ['An inspection record captures what was checked, what was observed and what follow-up is required.', 'Structured statuses help teams distinguish completed, rejected, not applicable and open items.', 'The record supports, but does not replace, qualified judgement.']],
      ['Evidence panel', ['Photos and documents need enough context to remain useful after the inspection moment.', 'An evidence view groups them with the related weld and finding.', 'That structure supports review, reporting and later retrieval.']],
      ['WPS/WPQR context', ['Procedure and qualification references belong close to the execution records they inform.', 'Reviewers can see which documentation is associated with a weld or project.', 'Suitability and validity remain matters for competent review.']],
      ['Report and handover preparation', ['Reporting should reflect maintained records and unresolved actions.', 'A connected workflow helps teams spot missing evidence before handover.', 'The output becomes easier to explain because its source records remain available.']],
      ['Frequently asked questions', ['Tool selection depends on project complexity, roles and existing quality procedures.', 'The questions below cover integration of records and responsibilities.', 'A trial offers a practical way to evaluate fit.']]
    ],
    faqs: [
      ['Which weld inspection tools are included in the workflow?', 'The workflow includes project and weld records, inspection entries, evidence, open actions, document context and reporting preparation.'],
      ['Can the tools replace project quality procedures?', 'No. They should be configured and used within the organisation’s approved procedures and responsibilities.'],
      ['Is the toolset useful for handover preparation?', 'Yes. Connected records make completeness checks and unresolved items easier to review before handover.']
    ],
    related: ['/weld-inspection-software', '/weld-inspection-app', '/wps-wpqr-software', '/reports']
  },
  {
    route: '/welding-inspection-checklist', lang: 'en',
    title: 'Welding inspection checklist software | WeldInspect Pro',
    description: 'Manage welding inspection checklist items, findings, photos, open actions and review status in a connected QA/QC workflow.',
    h1: 'Welding inspection checklist software for connected QA/QC workflows',
    kicker: 'Structured checklist records',
    intro: 'A welding inspection checklist is useful when its answers lead to clear evidence and follow-up. WeldInspect Pro keeps checklist status, findings, photos and review context connected to the project and weld record.',
    image: 'product-inspection-record.svg', alt: 'Welding inspection checklist with statuses findings and photo evidence',
    alternate: '/nl/lasinspectie-checklist',
    sections: [
      ['Checklist items and status', ['Checklist items can represent the inspection points defined by the project procedure.', 'Clear states such as accepted, rejected, not applicable and open make progress understandable.', 'The meaning of each state should remain aligned with approved working methods.']],
      ['Findings and open actions', ['A rejected or incomplete item needs more than a coloured cell.', 'The finding should explain what was observed and which action is expected.', 'Ownership and status allow the team to follow the issue through to review.']],
      ['Evidence and photo capture', ['Photos can support an inspection record when they are identifiable and relevant.', 'Linking them directly to the checklist item prevents ambiguity later.', 'Additional documents and notes can remain in the same project context.']],
      ['Review and handover', ['Reviewers can examine checklist completion together with evidence and unresolved points.', 'That makes it easier to prepare a factual project status before handover.', 'The checklist remains one input within the broader quality and documentation process.']],
      ['Checklist limitations and qualified review', ['A checklist cannot cover every technical judgement or unexpected project condition.', 'It should not encourage unqualified users to make acceptance decisions.', 'Qualified review, official requirements and project procedures remain leading.']],
      ['From recurring checks to project insight', ['Consistent checklist use gives teams a clearer view of recurring open points and missing evidence.', 'The purpose is practical follow-up rather than a superficial completion percentage.', 'Project managers and QA/QC can focus on records that require action.']],
      ['Frequently asked questions', ['Checklist software should support inspection work without presenting itself as the inspection authority.', 'These answers clarify status, custom use and evidence handling.', 'A demo can show the workflow in context.']]
    ],
    faqs: [
      ['Can checklist items include photos and comments?', 'Yes. Evidence and notes can be linked to the relevant inspection record and item.'],
      ['Does a completed checklist prove conformity?', 'No. A checklist supports documentation; qualified review and formal decisions remain necessary.'],
      ['Can open actions be followed after the field inspection?', 'Yes. Open items can remain visible for assignment, follow-up and later review.']
    ],
    related: ['/weld-inspection-software', '/weld-inspection-app', '/weld-inspection-tools', '/trial']
  },
  {
    route: '/ce-dossier-software', lang: 'en',
    title: 'CE dossier software for steel construction documentation | WeldInspect Pro',
    description: 'Prepare connected CE dossier information during execution with linked weld records, inspections, evidence, documents and open actions.',
    h1: 'CE dossier software for connected project, weld and inspection records',
    kicker: 'Dossier preparation during execution',
    intro: 'CE dossier preparation becomes more manageable when project records are maintained during execution. WeldInspect Pro helps steel construction teams organise welds, inspections, evidence, supporting documents and unresolved points in one connected workflow.',
    image: 'product-ce-dossier-readiness.svg', alt: 'CE dossier software showing document completeness and open actions',
    alternate: '/nl/ce-dossier-software',
    sections: [
      ['Dossier preparation during execution', ['Waiting until project completion to collect records creates avoidable pressure and uncertainty.', 'Teams can organise evidence as fabrication, inspection and review progress.', 'Early visibility makes missing or unclear records easier to address.']],
      ['Evidence trail', ['An evidence trail is useful when each item retains a clear source and project relationship.', 'Photos, inspection records and supporting files can be traced back to the relevant weld or activity.', 'This supports review without claiming that the platform itself validates the evidence.']],
      ['Document completeness', ['Completeness is a practical question about expected records, current status and unresolved gaps.', 'A shared view helps documentation and QA/QC teams coordinate their work.', 'Project-specific requirements still determine what must be included.']],
      ['Linked inspections and weld records', ['Inspection outcomes become more understandable when the underlying weld record remains available.', 'Findings and follow-up actions can stay attached to that record.', 'This reduces duplicate explanations during dossier review.']],
      ['Report preview and handover', ['Report preparation can draw on maintained project data rather than a new spreadsheet assembled at the end.', 'Teams can check presentation, missing fields and open actions before delivery.', 'The handover remains subject to required review and approval.']],
      ['Safe standards context', ['WeldInspect Pro supports documentation workflows around relevant standards.', 'Official standard texts, certification, qualified review and formal conformity decisions remain leading.', 'The platform does not guarantee CE approval or issue formal decisions.']],
      ['Frequently asked questions', ['Dossier content and responsibility differ by project and organisation.', 'The answers below explain how the platform supports preparation and review.', 'Specialist advice and current formal requirements should be used where needed.']]
    ],
    faqs: [
      ['Does WeldInspect Pro certify a CE dossier?', 'No. It helps organise the documentation workflow; certification and formal decisions remain with the appropriate qualified parties.'],
      ['Can missing documents and open points be reviewed before handover?', 'Yes. The workflow is intended to make completeness and follow-up visible during execution.'],
      ['Can weld and inspection records remain linked in the dossier context?', 'Yes. Connected project relationships are central to the product structure.']
    ],
    related: ['/en-1090-software', '/reports', '/wps-wpqr-software', '/platform']
  },
  {
    route: '/wps-wpqr-software', lang: 'en',
    title: 'WPS/WPQR software for welding documentation workflows | WeldInspect Pro',
    description: 'Keep WPS/WPQR references connected to welding projects, weld records, qualifications, evidence and QA/QC document review.',
    h1: 'WPS/WPQR software for connected welding procedure context',
    kicker: 'Procedure documentation in context',
    intro: 'WPS and WPQR documents are easier to manage when they remain connected to the projects and weld records that refer to them. WeldInspect Pro supports that context for welding coordinators, QA/QC teams and project documentation roles.',
    image: 'product-standards-context.svg', alt: 'WPS WPQR software with welding procedure and weld record context',
    alternate: '/nl/wps-wpqr-software',
    sections: [
      ['Procedure context', ['A procedure document has limited value when users cannot tell where it applies.', 'Project and weld links make the intended context easier to review.', 'The applicable requirements and technical suitability remain subject to qualified assessment.']],
      ['Weld qualification references', ['Qualification references can be organised alongside the records that depend on them.', 'This helps teams find the supporting context during inspection and documentation review.', 'It does not replace validation of scope, validity or personnel competence.']],
      ['Linking WPS/WPQR to weld records', ['A weld register creates the practical connection between planned work and procedure documentation.', 'Users can navigate from a weld to related references without searching several folders.', 'Changes and missing links become more visible to the responsible team.']],
      ['QA/QC and welding coordinator workflow', ['QA/QC needs access to current records while welding coordinators retain responsibility for technical oversight.', 'A shared platform can reduce duplicate registers and unclear document handoffs.', 'Roles remain explicit instead of being replaced by software rules.']],
      ['Document review', ['Reviewers can check whether expected references and evidence are present in project context.', 'Open questions can be followed before reporting and handover.', 'Official documents and approved procedures remain the controlling source.']],
      ['From procedure library to project use', ['A document library becomes more useful when it supports project selection and traceability.', 'Teams can distinguish general availability from actual use on a weld record.', 'That distinction supports clearer internal review.']],
      ['Frequently asked questions', ['Procedure terminology and responsibilities can vary between organisations.', 'These answers focus on connected documentation rather than formal qualification decisions.', 'A demo can be used to map the workflow to existing controls.']]
    ],
    faqs: [
      ['Does the software approve a WPS or WPQR?', 'No. It organises references and workflow context; approval and technical acceptance remain with qualified responsible parties.'],
      ['Can a WPS/WPQR reference be linked to a weld record?', 'Yes. The workflow is designed to keep procedure context visible beside project and weld information.'],
      ['Who benefits from connected procedure documentation?', 'Welding coordinators, QA/QC teams, inspectors and project documentation roles can work from the same context.']
    ],
    related: ['/en-1090-software', '/weld-inspection-tools', '/ce-dossier-software', '/standards']
  },
  {
    route: '/nl/en-1090-software', lang: 'nl',
    title: 'EN 1090 software voor lasinspecties en CE-dossier | WeldInspect Pro',
    description: 'Organiseer projecten, lassen, inspecties, WPS/WPQR, bewijsstukken en CE-dossierinformatie gestructureerd met WeldInspect Pro. Voor staalbouw, QA/QC en lascoördinatie.',
    h1: 'EN 1090 software voor lasinspecties, documentatie en CE-dossieropbouw',
    kicker: 'EN 1090-documentatie in projectcontext',
    intro: 'EN 1090-documentatie ontstaat gedurende het hele staalbouwproject. WeldInspect Pro helpt QA/QC, lascoördinatie en projectteams om het lasregister, inspectieverslagen, WPS/WPQR-verwijzingen, materiaalinformatie, bewijsstukken en dossierstatus met elkaar verbonden te houden.',
    image: 'nl-product-ce-dossier-readiness.svg', alt: 'EN 1090 software overzicht met lasinspecties en CE-dossierstatus',
    alternate: '/en-1090-software',
    sections: [
      ['Waarom EN 1090-documentatie vaak versnipperd raakt', ['Projectgegevens staan al snel verdeeld over Excel, gedeelde mappen, papieren formulieren en e-mail.', 'Een wijziging aan een las, tekening of inspectie kan daardoor meerdere versies achterlaten.', 'Een verbonden projectrecord maakt de actuele status beter zichtbaar zonder formele beoordeling te automatiseren.']],
      ['Van project naar lasregister, inspectie en dossier', ['Het project vormt de context voor lasnummers, inspectiemomenten en ondersteunende documenten.', 'Vanuit het lasregister kan het team zien welke inspectie, bevinding en actie bij een las hoort.', 'Die structuur loopt door tot rapportage en overdracht.']],
      ['Lasinspecties en bewijsstukken koppelen', ['Een inspectiefoto is pas bruikbaar wanneer duidelijk is bij welke las en bevinding deze hoort.', 'WeldInspect Pro bewaart die relatie samen met status, opmerkingen en opvolging.', 'QA/QC kan daardoor gerichter beoordelen wat compleet is en wat nog aandacht vraagt.']],
      ['WPS/WPQR en materiaaltraceerbaarheid zichtbaar houden', ['Procedureverwijzingen en materiaalcertificaten horen bij de uitvoering waarop ze betrekking hebben.', 'Door deze context bij project- en lasrecords te houden, zijn documenten sneller terug te vinden.', 'De lascoördinator en andere bevoegde personen blijven verantwoordelijk voor inhoudelijke geschiktheid.']],
      ['CE-dossier voorbereiden tijdens uitvoering', ['Dossieropbouw begint niet pas bij oplevering.', 'Ontbrekende documenten, open acties en los bewijs worden eerder zichtbaar wanneer het team tijdens uitvoering registreert.', 'Dat ondersteunt een beheerste overdracht zonder CE-goedkeuring te beloven.']],
      ['Voor wie is dit bedoeld?', ['De werkstroom is bedoeld voor staalbouwbedrijven, QA/QC, lascoördinatoren, inspecteurs en documentatieverantwoordelijken.', 'Iedere rol werkt vanuit dezelfde projectcontext met een eigen verantwoordelijkheid.', 'Een demo maakt duidelijk hoe dit aansluit op bestaande procedures.']],
      ['Wat WeldInspect Pro wel en niet doet', ['De software organiseert project-, las-, inspectie- en bewijsrecords en ondersteunt rapportagevoorbereiding.', 'De software vervangt geen normtekst, certificerende partij of bevoegde beoordelaar.', 'Formele beslissingen blijven buiten de software.']],
      ['Veelgestelde vragen', ['Onderstaande vragen gaan over verantwoordelijkheid, dossieropbouw en het koppelen van records.', 'De antwoorden beschrijven ondersteuning van het werkproces.', 'Projecteisen en officiële bronnen blijven altijd leidend.']]
    ],
    faqs: [
      ['Neemt WeldInspect Pro een EN 1090-conformiteitsbesluit?', 'Nee. De software organiseert documentatie en status. Bevoegde personen en formele partijen blijven verantwoordelijk voor beoordeling, certificering en conformiteitsbesluiten.'],
      ['Kunnen inspecties en bewijsstukken aan afzonderlijke lassen worden gekoppeld?', 'Ja. Het lasregister biedt context voor inspectiestatus, bevindingen, foto’s, documenten en open acties.'],
      ['Kan het CE-dossier tijdens uitvoering worden voorbereid?', 'Ja. Het werkproces maakt ontbrekende informatie en open punten zichtbaar terwijl het project loopt.']
    ],
    related: ['/nl/lasinspectie-software', '/nl/ce-dossier-software', '/nl/wps-wpqr-software', '/platform']
  },
  {
    route: '/nl/lasinspectie-software', lang: 'nl',
    title: 'Lasinspectie software voor staalbouw en QA/QC | WeldInspect Pro',
    description: 'Leg lasinspecties, foto’s, bevindingen, open acties en bewijsstukken vast in één verbonden werkproces voor staalbouw, QA/QC en lascoördinatie.',
    h1: 'Lasinspectie software waarmee inspecties, foto’s en bewijsstukken verbonden blijven',
    kicker: 'Lasinspectie in projectcontext',
    intro: 'Lasinspectie software moet de inspecteur helpen om informatie direct goed vast te leggen en QA/QC helpen om dezelfde context te beoordelen. WeldInspect Pro verbindt lassen, inspectieverslagen, foto’s, bevindingen en open acties zonder de rol van bevoegde personen over te nemen.',
    image: 'nl-product-inspection-record.svg', alt: 'Lasinspectie software overzicht met lasstatus en bewijsstukken',
    alternate: '/weld-inspection-software',
    sections: [
      ['Inspecties vastleggen terwijl het werk nog zichtbaar is', ['Waarnemingen zijn het duidelijkst wanneer de las en omliggende uitvoering nog beschikbaar zijn.', 'De inspecteur kan status, notities en bewijs direct in het projectrecord opnemen.', 'Daarmee ontstaat een beter navolgbare tijdlijn voor beoordeling.']],
      ['Lassen, bevindingen en open acties beheren', ['Een bevinding zonder lasnummer of projectcontext leidt tot extra zoekwerk.', 'Door de bevinding en actie aan de juiste las te koppelen, is zichtbaar wat moet gebeuren en wie opvolgt.', 'Open en afgeronde punten blijven van elkaar te onderscheiden.']],
      ['Foto’s en documenten koppelen aan de juiste las', ['Losse fotomappen geven zelden voldoende uitleg over locatie, moment en reden.', 'Een gekoppelde foto blijft onderdeel van het inspectieverslag.', 'Ook aanvullende documenten kunnen vanuit dezelfde context worden teruggevonden.']],
      ['Review door QA/QC en lascoördinator', ['QA/QC beoordeelt niet alleen aantallen, maar ook ontbrekend bewijs, open acties en records die nadere beoordeling vragen.', 'De lascoördinator behoudt zicht op procedure- en uitvoeringscontext.', 'Acceptatie blijft een bewuste handeling van bevoegde personen.']],
      ['Mobiele inspectie in de praktijk', ['De responsieve werkstroom is bruikbaar op telefoon, tablet en desktop.', 'Werkvloer en kantoor kijken daardoor naar hetzelfde projectrecord.', 'Dubbele invoer na een inspectieronde wordt zoveel mogelijk voorkomen.']],
      ['Verschil met Excel, losse foto’s en e-mail', ['Excel kan een lijst bijhouden, maar relaties met foto’s, revisies en opmerkingen worden snel kwetsbaar.', 'E-mail maakt opvolging afhankelijk van individuele inboxen.', 'Een verbonden platform houdt de context beschikbaar voor het hele bevoegde team.']],
      ['Veelgestelde vragen', ['Teams vragen vaak naar mobiel gebruik, foto’s en de grens tussen registratie en formele beoordeling.', 'Onderstaande antwoorden leggen die praktische rol uit.', 'De inrichting moet altijd aansluiten op de eigen kwaliteitsprocedures.']]
    ],
    faqs: [
      ['Kan lasinspectie software op een tablet worden gebruikt?', 'Ja. WeldInspect Pro heeft een responsieve webinterface voor gangbare desktop-, tablet- en mobiele schermen.'],
      ['Vervangt de software een bevoegde lasinspecteur?', 'Nee. De software ondersteunt registratie, bewijs en opvolging; bevoegde personen blijven verantwoordelijk voor beoordeling en acceptatie.'],
      ['Blijven foto’s en open acties gekoppeld aan de las?', 'Ja. Het behouden van die project- en lascontext is een centraal onderdeel van het werkproces.']
    ],
    related: ['/nl/lascontrole-software', '/nl/las-controle-app', '/nl/lasinspectie-checklist', '/platform']
  },
  {
    route: '/nl/lascontrole-software', lang: 'nl',
    title: 'Lascontrole software voor beheerst inspectiewerk | WeldInspect Pro',
    description: 'Beheer lassen, controlepunten, bevindingen, herstelacties, inspectiestatus en rapportage in een gestructureerd werkproces.',
    h1: 'Lascontrole software voor lassen, bevindingen, acties en rapportage',
    kicker: 'Beheerste lascontrole',
    intro: 'Lascontrole omvat meer dan een vinkje bij een las. Het werk vraagt om duidelijke controlepunten, een herkenbaar lasrecord, feitelijke bevindingen, opvolging van herstelpunten en beoordeling door de juiste rol.',
    image: 'nl-product-weld-register.svg', alt: 'Lascontrole software met lasregister bevindingen en open acties',
    sections: [
      ['Wat is lascontrole in de praktijk?', ['Lascontrole begint bij een duidelijk werkpakket en herkenbare lasidentificatie.', 'De inspecteur legt vast wat is bekeken, welke status geldt en welke onderbouwing aanwezig is.', 'De projectprocedure bepaalt wie controleert en wie accepteert.']],
      ['Controlepunten, status en opvolging', ['Gestructureerde statussen maken onderscheid tussen akkoord, afkeur, niet van toepassing en open actie.', 'Een status zonder toelichting is bij afwijkingen niet voldoende.', 'Daarom blijven opmerkingen en bewijs bij hetzelfde controlerecord.']],
      ['Bevindingen en herstelpunten vastleggen', ['Een bevinding beschrijft feitelijk wat is waargenomen en waar.', 'Een herstelpunt krijgt een eigenaar en opvolgstatus zodat het niet verdwijnt in losse communicatie.', 'Na uitvoering kan een bevoegde reviewer de nieuwe situatie beoordelen.']],
      ['Inspectieoverzicht per project', ['Projectteams hebben behoefte aan overzicht per las, onderdeel en huidige status.', 'Het dashboard helpt prioriteiten te herkennen zonder alleen op een totaalpercentage te sturen.', 'Onderliggende records blijven beschikbaar voor inhoudelijke controle.']],
      ['Rapportage en dossiergereedheid', ['Rapportage wordt betrouwbaarder wanneer deze voortkomt uit onderhouden inspectierecords.', 'Open punten en ontbrekend bewijs zijn vóór overdracht zichtbaar.', 'Dossiergereedheid blijft een praktische voortgangsindicatie en geen formeel conformiteitsbesluit.']],
      ['Lascontrole versus lasinspectie', ['In dagelijkse taal overlappen lascontrole en lasinspectie vaak.', 'Lascontrole benadrukt regelmatig het controlepunt en de opvolging, terwijl lasinspectie ook de bredere beoordeling en bewijsvoering omvat.', 'Binnen WeldInspect Pro blijven beide activiteiten in dezelfde projectcontext.']],
      ['Veelgestelde vragen', ['Onderstaande vragen verduidelijken statussen, herstelacties en rapportage.', 'De software ondersteunt een beheerst proces maar schrijft geen technische acceptatie voor.', 'Eigen procedures en bevoegde beoordeling blijven leidend.']]
    ],
    faqs: [
      ['Kan een afgekeurd controlepunt een herstelactie krijgen?', 'Ja. Een bevinding kan met een open actie, verantwoordelijke context en opvolgstatus worden vastgelegd.'],
      ['Is lascontrole hetzelfde als lasinspectie?', 'De termen overlappen, maar lasinspectie kan breder zijn. De gekozen projectprocedure bepaalt de precieze inhoud en verantwoordelijkheden.'],
      ['Kan het projectoverzicht open punten tonen?', 'Ja. Open acties en ontbrekende informatie kunnen per project zichtbaar worden gemaakt voor opvolging.']
    ],
    related: ['/nl/lasinspectie-software', '/nl/las-controle-app', '/nl/digitale-lasinspectie', '/nl/contact']
  },
  {
    route: '/nl/las-controle-app', lang: 'nl',
    title: 'Las controle app voor inspecties op de werkvloer | WeldInspect Pro',
    description: 'Gebruik een las controle app voor mobiele inspecties, foto’s, bevindingen en open acties, gekoppeld aan de juiste las en projectdocumentatie.',
    h1: 'Las controle app voor inspecties, foto’s en open acties',
    kicker: 'Mobiele inspectie op de werkvloer',
    intro: 'Met een las controle app legt de inspecteur informatie vast waar het werk plaatsvindt. WeldInspect Pro houdt foto’s, bevindingen, open acties en documentcontext bij de juiste las, zodat QA/QC later vanuit hetzelfde record kan beoordelen.',
    image: 'nl-product-mobile-inspection.svg', alt: 'Las controle app met mobiele inspectie foto en open actie',
    alternate: '/weld-inspection-app',
    sections: [
      ['Lascontrole op mobiel of tablet', ['De inspecteur start vanuit het project en selecteert de relevante las.', 'Daardoor krijgt elke registratie direct een herkenbare context.', 'De bediening blijft bruikbaar op gangbare mobiele schermen zonder horizontaal te schuiven.']],
      ['Foto’s direct bij de juiste las bewaren', ['Een foto zonder lasnummer of toelichting verliest snel zijn betekenis.', 'Direct koppelen voorkomt dat beelden achteraf handmatig moeten worden hernoemd en verdeeld.', 'De foto blijft samen met het inspectiemoment en de bevinding beschikbaar.']],
      ['Bevindingen vastleggen zonder losse notities', ['Papieren aantekeningen en telefoonnotities vragen later om dubbele invoer.', 'Een mobiele registratie legt de feitelijke waarneming meteen vast.', 'Aanvullende beoordeling kan daarna door de bevoegde rol plaatsvinden.']],
      ['Open acties opvolgen', ['Niet iedere bevinding wordt tijdens dezelfde ronde opgelost.', 'Een open actie maakt zichtbaar wat nog moet gebeuren en waar de verantwoordelijkheid ligt.', 'De status blijft onderdeel van het projectoverzicht tot een bevoegde reviewer deze afhandelt.']],
      ['Koppeling met WPS/WPQR en documenten', ['De werkvloer heeft baat bij vindbare procedure- en documentcontext.', 'Relevante verwijzingen kunnen bij project en las beschikbaar blijven.', 'De lascoördinator beoordeelt welke documenten van toepassing en geldig zijn.']],
      ['Wanneer demo aanvragen?', ['Een demo is zinvol wanneer foto’s nu via privételefoons, chat of gedeelde mappen worden verzameld.', 'Ook teams met dubbele invoer tussen werkvloer en kantoor kunnen het proces vergelijken.', 'Tijdens de demo staan rollen, apparaten en bestaande procedures centraal.']],
      ['Veelgestelde vragen', ['Veel vragen gaan over apparaten, fotokoppeling en de afhandeling van acties.', 'De antwoorden beschrijven de praktische werking.', 'Technische acceptatie blijft bij bevoegde personen.']]
    ],
    faqs: [
      ['Werkt de las controle app op een telefoon?', 'Ja. WeldInspect Pro biedt een responsieve webinterface voor actuele mobiele browsers, tablets en desktops.'],
      ['Kan ik een foto meteen aan een las koppelen?', 'Ja. De workflow is ingericht om bewijs bij het juiste project- en lasrecord te bewaren.'],
      ['Beslist de app of een herstelactie is geaccepteerd?', 'Nee. De app registreert status en bewijs; een bevoegde persoon neemt de inhoudelijke beslissing.']
    ],
    related: ['/nl/lasinspectie-software', '/nl/lascontrole-software', '/nl/lasinspectie-checklist', '/nl/demo']
  },
  {
    route: '/nl/digitale-lasinspectie', lang: 'nl',
    title: 'Digitale lasinspectie voor staalbouwprojecten | WeldInspect Pro',
    description: 'Organiseer digitale lasinspectie van lasregister en inspectieverslag tot bewijsstukken, review, rapportage en dossieroverdracht.',
    h1: 'Digitale lasinspectie van lasregistratie tot dossieroverdracht',
    kicker: 'Van werkvloer naar overdracht',
    intro: 'Digitale lasinspectie verbindt het lasregister met inspectieverslagen, foto’s, documenten, review en rapportage. De waarde zit niet alleen in papierloos werken, maar vooral in het behouden van projectcontext en traceerbaarheid.',
    image: 'nl-product-project-overview.svg', alt: 'Digitale lasinspectie met lasregister inspectieverslagen en dossieroverdracht',
    sections: [
      ['Waarom digitaal vastleggen', ['Digitale registratie voorkomt dat informatie meerdere keren wordt overgeschreven.', 'Het projectteam kan sneller zien welke versie actueel is en welke acties nog openstaan.', 'De kwaliteit van invoer en beoordeling blijft afhankelijk van duidelijke procedures en bevoegde gebruikers.']],
      ['Lasregister als basis', ['Een herkenbaar lasnummer vormt de basis voor inspectiestatus, bewijs en documentverwijzingen.', 'Het register maakt de omvang van het werk en de voortgang zichtbaar.', 'Vanuit dezelfde structuur kan het team doorklikken naar onderliggende records.']],
      ['Inspectieverslagen, bewijs en review', ['Een inspectieverslag beschrijft controle, bevinding, status en eventuele vervolgactie.', 'Foto’s en documenten ondersteunen het record wanneer hun relatie duidelijk blijft.', 'QA/QC en lascoördinatie beoordelen de inhoud volgens hun rol.']],
      ['Traceerbaarheid van documenten', ['Tekeningen, certificaten, WPS/WPQR en rapporten kunnen rond het project worden georganiseerd.', 'De gebruiker ziet waar een document wordt gebruikt en welke context erbij hoort.', 'Formele geldigheid moet nog steeds inhoudelijk worden gecontroleerd.']],
      ['CE-dossier gereedmaken', ['Dossieropbouw wordt een doorlopend proces wanneer bewijs tijdens uitvoering wordt gekoppeld.', 'Ontbrekende informatie komt eerder aan het licht.', 'De dossierstatus ondersteunt voorbereiding maar is geen automatische conformiteitsverklaring.']],
      ['Praktische workflow', ['Start met projectinrichting en lasregister, registreer inspecties op de werkvloer en volg open acties op.', 'Controleer daarna documentcontext en bewijs voordat rapportage wordt voorbereid.', 'Deze volgorde houdt uitvoering en overdracht met elkaar verbonden.']],
      ['Veelgestelde vragen', ['Onderstaande antwoorden gaan over digitalisering, traceerbaarheid en dossierstatus.', 'Ze maken onderscheid tussen administratieve ondersteuning en formele beoordeling.', 'De eigen kwaliteitsorganisatie blijft bepalend.']]
    ],
    faqs: [
      ['Is digitale lasinspectie alleen papierloos werken?', 'Nee. De belangrijkste winst is dat las-, inspectie-, bewijs- en documentcontext met elkaar verbonden blijven.'],
      ['Kan digitale registratie helpen bij traceerbaarheid?', 'Ja. Duidelijke relaties tussen records maken documenten en bewijs beter terugvindbaar.'],
      ['Betekent dossiergereed dat het project formeel is geaccepteerd?', 'Nee. Dossiergereedheid is een praktische status; formele beoordeling en besluiten blijven afzonderlijk nodig.']
    ],
    related: ['/nl/lasinspectie-software', '/nl/lascontrole-software', '/nl/ce-dossier-software', '/platform']
  },
  {
    route: '/nl/ce-dossier-software', lang: 'nl',
    title: 'CE-dossier software voor staalbouwdocumentatie | WeldInspect Pro',
    description: 'Bereid CE-dossierinformatie tijdens uitvoering voor met gekoppelde projecten, lassen, inspecties, bewijsstukken, documenten en open punten.',
    h1: 'CE-dossier software voor gestructureerde projectdocumentatie',
    kicker: 'Dossieropbouw tijdens uitvoering',
    intro: 'CE-dossier software ondersteunt teams bij het organiseren van projectdocumentatie terwijl het staalbouwproject loopt. WeldInspect Pro houdt lassen, inspecties, bewijsstukken, documenten en open punten in een samenhangende projectstructuur.',
    image: 'nl-product-ce-dossier-readiness.svg', alt: 'CE-dossier software met projectdocumentatie bewijsstukken en open punten',
    alternate: '/ce-dossier-software',
    sections: [
      ['CE-dossier opbouwen tijdens uitvoering', ['Documenten pas bij oplevering verzamelen zorgt voor tijdsdruk en onduidelijkheid.', 'Door tijdens fabricage en inspectie te registreren, worden hiaten eerder zichtbaar.', 'Het team kan ontbrekende informatie opvolgen voordat de overdracht begint.']],
      ['Projecten, lassen, inspecties en documenten verbinden', ['Projectscope geeft betekenis aan lasrecords en inspectieverslagen.', 'Documenten en foto’s blijven bruikbaar doordat hun relatie met uitvoering zichtbaar is.', 'Dat vermindert handmatig zoekwerk tijdens review.']],
      ['Bewijsstukken en rapportage voorbereiden', ['Bewijsstukken kunnen bestaan uit inspectiefoto’s, verslagen, certificaten en ondersteunende documenten.', 'Onderhouden records vormen een betere basis voor rapportage dan een nieuwe eindlijst.', 'De broncontext blijft beschikbaar wanneer vragen ontstaan.']],
      ['Open punten vóór oplevering zichtbaar maken', ['Open acties, ontbrekende documenten en records in beoordeling verdienen afzonderlijke aandacht.', 'Een overzicht helpt QA/QC en projectleiding om prioriteiten te stellen.', 'Alleen bevoegde personen kunnen bepalen wanneer een punt inhoudelijk is afgehandeld.']],
      ['Veilige normclaim', ['WeldInspect Pro ondersteunt werkprocessen en documentatie rondom relevante normen.', 'Officiële normteksten, certificering, beoordeling door bevoegde personen en formele conformiteitsbesluiten blijven leidend.', 'De software garandeert geen CE-goedkeuring.']],
      ['Samenwerken rond dossiergereedheid', ['Documentatie, QA/QC, lascoördinatie en projectleiding hebben verschillende verantwoordelijkheden maar gebruiken dezelfde projectgegevens.', 'Een gedeelde status voorkomt parallelle versies.', 'Dossiergereedheid blijft een hulpmiddel voor voorbereiding en overdracht.']],
      ['Veelgestelde vragen', ['Dossierinhoud verschilt per project, contract en organisatie.', 'Onderstaande antwoorden leggen uit hoe de software ondersteunt.', 'Actuele formele eisen en specialistische beoordeling blijven nodig.']]
    ],
    faqs: [
      ['Certificeert WeldInspect Pro een CE-dossier?', 'Nee. WeldInspect Pro helpt de documentatiewerkstroom organiseren; certificering en formele besluiten blijven bij de bevoegde partijen.'],
      ['Kunnen open punten vóór overdracht zichtbaar worden gemaakt?', 'Ja. De werkstroom ondersteunt overzicht van ontbrekende informatie, open acties en reviewstatus.'],
      ['Blijven las- en inspectierecords gekoppeld aan het dossier?', 'Ja. De projectrelaties tussen lassen, inspecties, bewijs en documenten blijven behouden.']
    ],
    related: ['/nl/en-1090-software', '/nl/wps-wpqr-software', '/reports', '/nl/contact']
  },
  {
    route: '/nl/wps-wpqr-software', lang: 'nl',
    title: 'WPS/WPQR software voor lasdocumentatie | WeldInspect Pro',
    description: 'Houd WPS/WPQR-verwijzingen gekoppeld aan projecten, lassen, kwalificaties, bewijsstukken en documentreview voor QA/QC en lascoördinatie.',
    h1: 'WPS/WPQR software voor overzichtelijke koppeling met projecten en lassen',
    kicker: 'Lasprocedurecontext verbonden',
    intro: 'WPS/WPQR software is vooral waardevol wanneer procedure- en kwalificatiedocumenten zichtbaar blijven bij de projecten en lassen waarop ze betrekking hebben. WeldInspect Pro ondersteunt die samenhang voor lascoördinatie, QA/QC en documentatie.',
    image: 'nl-product-standards-context.svg', alt: 'WPS WPQR software met lasprocedure project en lasregister',
    alternate: '/wps-wpqr-software',
    sections: [
      ['WPS/WPQR in projectcontext', ['Een procedurebestand in een algemene map laat niet automatisch zien waar het wordt toegepast.', 'Projectkoppelingen maken het beoogde gebruik beter navolgbaar.', 'Bevoegde personen blijven verantwoordelijk voor inhoud, geldigheid en toepassingsgebied.']],
      ['Koppeling met lasregister', ['Het lasregister vormt de praktische verbinding tussen uitvoering en procedurecontext.', 'Gebruikers kunnen vanuit een lasrecord relevante verwijzingen terugvinden.', 'Ontbrekende of onduidelijke koppelingen worden eerder zichtbaar.']],
      ['Lasmethode, kwalificaties en bewijsstukken', ['Lasmethode en kwalificatieverwijzingen horen in een controleerbare projectcontext.', 'Ondersteunende documenten en bewijsstukken kunnen daarnaast worden georganiseerd.', 'De software trekt geen technische conclusie over geschiktheid.']],
      ['Documenten snel terugvinden', ['Een consistente naam en koppeling voorkomt zoeken in meerdere mappen en e-mailthreads.', 'Reviewers zien welke documentcontext bij een project of las hoort.', 'Revisiebeheer en formele vrijgave blijven onderdeel van de eigen procedures.']],
      ['Rol van lascoördinator', ['De lascoördinator houdt toezicht op technische lasactiviteiten binnen de toegewezen verantwoordelijkheid.', 'Software ondersteunt overzicht en samenwerking maar neemt die rol niet over.', 'QA/QC kan vanuit dezelfde records documentstatus en inspectiecontext beoordelen.']],
      ['Van documentbibliotheek naar uitvoering', ['Een bibliotheek toont welke documenten beschikbaar zijn, maar projectgebruik vraagt een expliciete relatie.', 'Die relatie maakt duidelijk welke referentie tijdens uitvoering is gebruikt.', 'Dat ondersteunt beoordeling en latere overdracht.']],
      ['Veelgestelde vragen', ['WPS/WPQR-termen en werkwijzen verschillen tussen organisaties.', 'Onderstaande antwoorden richten zich op documentkoppeling en verantwoordelijkheid.', 'Officiële documenten en bevoegde beoordeling blijven leidend.']]
    ],
    faqs: [
      ['Keurt WeldInspect Pro een WPS of WPQR goed?', 'Nee. De software organiseert documenten en verwijzingen; technische goedkeuring en acceptatie blijven bij bevoegde personen.'],
      ['Kan een WPS/WPQR aan een lasrecord worden gekoppeld?', 'Ja. Procedurecontext kan naast project- en lasinformatie zichtbaar worden gehouden.'],
      ['Voor welke rollen is dit nuttig?', 'Lascoördinatoren, QA/QC, inspecteurs en documentatieverantwoordelijken kunnen vanuit dezelfde context werken.']
    ],
    related: ['/nl/en-1090-software', '/nl/ce-dossier-software', '/nl/lasinspectie-software', '/standards']
  },
  {
    route: '/nl/lasinspectie-checklist', lang: 'nl',
    title: 'Lasinspectie checklist digitaal beheren | WeldInspect Pro',
    description: 'Beheer een lasinspectie checklist met duidelijke statussen, bevindingen, foto’s, opmerkingen, open acties en dossiercontext.',
    h1: 'Lasinspectie checklist digitaal vastleggen en opvolgen',
    kicker: 'Controlepunten met bewijs en opvolging',
    intro: 'Een digitale lasinspectie checklist is bruikbaar wanneer ieder controlepunt een duidelijke status, toelichting en bewijscontext kan krijgen. WeldInspect Pro verbindt checklistrecords met lassen, foto’s, open acties en projectdocumentatie.',
    image: 'nl-product-inspection-record.svg', alt: 'Lasinspectie checklist met statussen foto’s en open acties',
    alternate: '/welding-inspection-checklist',
    sections: [
      ['Checklist per project of inspectiemoment', ['Controlepunten horen aan te sluiten op het project, de inspectiefase en de geldende procedure.', 'Een digitale checklist houdt het inspectiemoment herkenbaar binnen het project.', 'De verantwoordelijke organisatie bepaalt welke punten nodig zijn.']],
      ['Status: akkoord, afkeur, n.v.t. en open actie', ['Eenduidige statussen maken voortgang leesbaar voor inspecteur en reviewer.', 'Bij afkeur of een open actie hoort voldoende toelichting.', 'Niet van toepassing vraagt eveneens een bewuste keuze binnen de procedure.']],
      ['Foto’s en opmerkingen koppelen', ['Een foto ondersteunt het record wanneer duidelijk is wat erop staat en bij welke las deze hoort.', 'Opmerkingen beschrijven de feitelijke waarneming en eventuele vervolgactie.', 'Alles blijft beschikbaar voor latere review.']],
      ['Checklist als onderdeel van dossieropbouw', ['De checklist is één bron binnen een bredere verzameling projectdocumentatie.', 'Inspectieverslagen, WPS/WPQR, materiaalbewijs en rapportage hebben hun eigen rol.', 'Een gekoppelde structuur maakt de onderlinge samenhang zichtbaar.']],
      ['Praktisch beoordelen in plaats van een losse download', ['Een algemene download kan nooit alle projectvereisten en verantwoordelijkheden afdekken.', 'WeldInspect Pro richt zich daarom op een werkende digitale registratie met projectcontext.', 'Tijdens een demo of proefperiode kan het team de aanpak toetsen aan de eigen praktijk.']],
      ['Grenzen van een checklist', ['Een checklist kan onverwachte omstandigheden of specialistische beoordeling niet volledig vangen.', 'De lijst mag geen schijnzekerheid geven aan onbevoegde gebruikers.', 'Normteksten, procedures en gekwalificeerde review blijven leidend.']],
      ['Veelgestelde vragen', ['Onderstaande antwoorden gaan over statussen, bewijs en de rol in dossieropbouw.', 'De checklist ondersteunt registratie en opvolging.', 'Formele acceptatie blijft een afzonderlijke verantwoordelijkheid.']]
    ],
    faqs: [
      ['Kan ik foto’s en opmerkingen aan een checklistpunt koppelen?', 'Ja. Bewijs en toelichting kunnen bij het relevante inspectierecord en controlepunt blijven.'],
      ['Bewijst een volledig ingevulde checklist conformiteit?', 'Nee. Een checklist ondersteunt documentatie; bevoegde beoordeling en formele besluiten blijven noodzakelijk.'],
      ['Kan een open actie na de inspectie worden opgevolgd?', 'Ja. Het open punt kan zichtbaar blijven voor toewijzing, opvolging en latere review.']
    ],
    related: ['/nl/lasinspectie-software', '/nl/las-controle-app', '/nl/digitale-lasinspectie', '/nl/trial']
  }
];

const nlDisclaimer = 'WeldInspect Pro ondersteunt werkprocessen en documentatie rondom relevante normen. Officiële normteksten, certificering, beoordeling door bevoegde personen en formele conformiteitsbesluiten blijven leidend.';
const enDisclaimer = 'WeldInspect Pro supports documentation workflows around relevant standards. Official standard texts, certification, qualified review and formal conformity decisions remain leading.';

const names = Object.fromEntries(pages.map((page) => [page.route, page.h1.replace(/[.?!]$/, '')]));
Object.assign(names, {
  '/platform': 'Platform overview', '/reports': 'Reports and handover', '/standards': 'Standards context',
  '/contact': 'Contact WeldInspect Pro', '/trial': 'Start a trial', '/nl/contact': 'Neem contact op',
  '/nl/trial': 'Start proefperiode', '/nl/demo': 'Plan demo'
});

function header(lang) {
  if (lang === 'nl') return `<header class="site-header"><div class="container nav-shell"><a class="brand" href="/nl" aria-label="WeldInspect Pro startpagina"><span class="brand-mark">W</span><span><strong>WELDINSPECT <em>PRO</em></strong><small>Digitale lasinspectie &amp; dossieropbouw</small></span></a><nav class="desktop-nav" aria-label="Hoofdnavigatie"><a href="/nl/en-1090-software">EN 1090 software</a><a href="/nl/lasinspectie-software">Lasinspectie software</a><a href="/nl/ce-dossier-software">CE-dossier</a><a href="/nl/blog/">Kennisbank</a><a href="/nl/contact">Contact</a></nav><div class="nav-actions"><a class="btn btn-ghost" href="https://app.weldinspectpro.com/login">Inloggen</a><a class="btn btn-primary" href="/nl/trial">Start proefperiode</a><a class="btn-lang" href="/" lang="en">EN</a></div><button class="menu-button" type="button" aria-label="Menu openen" aria-controls="mobileMenu" aria-expanded="false"><span></span><span></span><span></span></button></div><nav class="mobile-menu" id="mobileMenu" aria-label="Mobiele navigatie"><a href="/nl/en-1090-software">EN 1090 software</a><a href="/nl/lasinspectie-software">Lasinspectie software</a><a href="/nl/lascontrole-software">Lascontrole software</a><a href="/nl/ce-dossier-software">CE-dossier</a><a href="/nl/blog/">Kennisbank</a><a href="/nl/contact">Contact</a><a class="btn btn-primary" href="/nl/trial">Start proefperiode</a></nav></header>`;
  return `<header class="site-header"><div class="container nav-shell"><a class="brand" href="/" aria-label="WeldInspect Pro home"><span class="brand-mark">W</span><span><strong>WELDINSPECT <em>PRO</em></strong><small>Weld inspection &amp; documentation</small></span></a><nav class="desktop-nav" aria-label="Main navigation"><a href="/platform">Platform</a><a href="/inspections">Inspections</a><a href="/standards">Standards</a><a href="/reports">Reports</a><a href="/resources">Resources</a><a href="/contact">Contact</a></nav><div class="nav-actions"><a class="btn btn-ghost" href="https://app.weldinspectpro.com/login">Login</a><a class="btn btn-primary" href="/trial">Start Free Trial</a><a class="btn-lang" href="/nl" lang="nl">NL</a></div><button class="menu-button" type="button" aria-label="Open menu" aria-controls="mobileMenu" aria-expanded="false"><span></span><span></span><span></span></button></div><nav class="mobile-menu" id="mobileMenu" aria-label="Mobile navigation"><a href="/platform">Platform</a><a href="/inspections">Inspections</a><a href="/standards">Standards</a><a href="/reports">Reports</a><a href="/resources">Resources</a><a href="/contact">Contact</a><a class="btn btn-primary" href="/trial">Start Free Trial</a></nav></header>`;
}

function footer(lang = 'en') {
  if (lang === 'nl') return `<footer class="footer" id="footer"><div class="container footer-grid search-footer-grid"><div class="footer-brand"><a class="brand" href="/nl"><span class="brand-mark">W</span><span><strong>WELDINSPECT <em>PRO</em></strong><small>Lasinspectie &amp; projectdocumentatie</small></span></a><p>Verbonden werkprocessen voor lasinspectie, traceerbaarheid en projectdocumentatie.</p></div><div><h4>Platform</h4><a href="/platform">Platformoverzicht</a><a href="/inspections">Inspecties</a><a href="/reports">Rapportage</a><a href="/standards">Normcontext</a><a href="/nl/blog/">Kennisbank</a></div><div><h4>Oplossingen</h4><a href="/nl/en-1090-software">EN 1090 software</a><a href="/nl/lasinspectie-software">Lasinspectie software</a><a href="/nl/lascontrole-software">Lascontrole software</a><a href="/nl/las-controle-app">Las controle app</a><a href="/nl/ce-dossier-software">CE-dossier software</a></div><div><h4>Documentatie</h4><a href="/nl/wps-wpqr-software">WPS/WPQR software</a><a href="/nl/digitale-lasinspectie">Digitale lasinspectie</a><a href="/nl/lasinspectie-checklist">Lasinspectie checklist</a><a href="/nl/blog/">Kennisbank</a></div><div><h4>Bedrijf</h4><a href="/nl/prijzen">Prijzen</a><a href="/nl/demo">Demo</a><a href="/nl/trial">Proefperiode</a><a href="/nl/contact">Contact</a></div><div><h4>Juridisch</h4><a href="/legal">Juridisch</a><a href="/terms">Voorwaarden</a><a href="/privacy">Privacy</a><a href="/dpa">Verwerkersovereenkomst</a></div></div><div class="container copyright">&copy; 2026 WeldInspect Pro. Alle rechten voorbehouden.</div></footer>`;
  return `<footer class="footer" id="footer"><div class="container footer-grid search-footer-grid"><div class="footer-brand"><a class="brand" href="/"><span class="brand-mark">W</span><span><strong>WELDINSPECT <em>PRO</em></strong><small>Weld inspection &amp; documentation</small></span></a><p>Connected workflows for weld inspection, traceability and project documentation.</p></div><div><h4>Platform</h4><a href="/platform">Platform overview</a><a href="/inspections">Inspections</a><a href="/reports">Reports</a><a href="/standards">Standards</a><a href="/resources">Resources</a></div><div><h4>Solutions</h4><a href="/en-1090-software">EN 1090 software</a><a href="/weld-inspection-software">Weld inspection software</a><a href="/weld-inspection-app">Weld inspection app</a><a href="/ce-dossier-software">CE dossier software</a><a href="/wps-wpqr-software">WPS/WPQR software</a></div><div><h4>Nederlands</h4><a href="/nl/en-1090-software">EN 1090 software</a><a href="/nl/lasinspectie-software">Lasinspectie software</a><a href="/nl/lascontrole-software">Lascontrole software</a><a href="/nl/las-controle-app">Las controle app</a><a href="/nl/ce-dossier-software">CE-dossier software</a></div><div><h4>Company</h4><a href="/pricing">Pricing</a><a href="/demo">Demo</a><a href="/trial">Trial</a><a href="/contact">Contact</a></div><div><h4>Legal</h4><a href="/legal">Legal</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/dpa">DPA</a></div></div><div class="container copyright">&copy; 2026 WeldInspect Pro. All rights reserved.</div></footer>`;
}

function schema(page) {
  const url = `${base}${page.route}`;
  return JSON.stringify([
    {'@context':'https://schema.org','@type':'WebPage',name:page.h1,description:page.description,url,inLanguage:page.lang},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:page.lang === 'nl' ? 'Startpagina' : 'Home',item:page.lang === 'nl' ? `${base}/nl/` : `${base}/`},
      {'@type':'ListItem',position:2,name:page.h1,item:url}
    ]},
    {'@context':'https://schema.org','@type':'FAQPage',mainEntity:page.faqs.map(([name,text]) => ({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}))}
  ]).replace(/</g, '\\u003c');
}

function pageHtml(page) {
  const nl = page.lang === 'nl';
  const url = `${base}${page.route}`;
  const alt = page.alternate ? `${base}${page.alternate}` : url;
  const trial = nl ? '/nl/trial' : '/trial';
  const demo = nl ? '/nl/demo' : '/demo';
  const contact = nl ? '/nl/contact' : '/contact';
  const platform = '/platform';
  const contextParagraphs = nl ? [
    `Bij ${titleFor(page)} gaat het niet om een los scherm, maar om de relatie tussen uitvoering, bewijs en verantwoordelijkheid. Het team kan de broninformatie terugvinden, open vragen bespreken en vastleggen wie volgens de eigen procedure een vervolgactie uitvoert of een record beoordeelt.`,
    `De praktische waarde ontstaat wanneer werkvloer en kantoor dezelfde actuele projectgegevens gebruiken. Inspecteur, QA/QC en lascoördinator hoeven informatie dan niet opnieuw samen te stellen uit mappen en berichten, terwijl iedere rol wel de eigen inhoudelijke verantwoordelijkheid behoudt.`,
    `Een herkenbare status helpt bij planning, maar de onderliggende notities, documenten en bewijsstukken blijven nodig voor een zorgvuldige review. WeldInspect Pro houdt die onderdelen bij elkaar en laat de bevoegde gebruiker bepalen welke conclusie of vervolgactie passend is.`,
    `Door dit onderdeel tijdens uitvoering te onderhouden, hoeft het team bij rapportage of overdracht minder geschiedenis te reconstrueren. Onvolledige koppelingen en open vragen komen eerder naar voren, zodat zij binnen het bestaande kwaliteitsproces kunnen worden opgevolgd.`,
    `De projectstructuur ondersteunt samenwerking zonder verantwoordelijkheden te vervagen. Gebruikers zien dezelfde feiten en relaties, maar technische acceptatie, documentvrijgave en formele besluiten blijven expliciet bij de daarvoor aangewezen personen en organisaties.`,
    `Deze aanpak maakt verschillen tussen beschikbaar, beoordeeld en afgerond beter zichtbaar. Dat is belangrijk voor een realistisch projectoverzicht: een aanwezig bestand is niet automatisch inhoudelijk geschikt en een ingevuld record is niet automatisch formeel geaccepteerd.`,
    `Tijdens een demo of proefperiode kan het team dit onderdeel vergelijken met de huidige werkwijze. Daarbij zijn rollen, bestaande procedures, gewenste rapportage en de manier waarop bewijs wordt vastgelegd belangrijker dan een algemene functielijst.`
  ] : [
    `For ${titleFor(page)}, the value lies in the relationship between execution, evidence and responsibility rather than in an isolated screen. The team can retrieve source records, discuss open questions and record who performs follow-up or review under the approved procedure.`,
    `The practical benefit appears when field and office roles use the same current project information. Inspectors, QA/QC and welding coordinators no longer need to reconstruct context from folders and messages, while each role keeps its own technical responsibility.`,
    `A recognisable status supports planning, but notes, documents and evidence remain necessary for careful review. WeldInspect Pro keeps those elements together and leaves the appropriate conclusion or next action to the authorised user.`,
    `Maintaining this area during execution reduces the history that must be rebuilt for reporting or handover. Missing relationships and open questions become visible earlier, allowing them to be addressed through the organisation’s existing quality process.`,
    `The project structure supports collaboration without blurring responsibilities. Users can view the same facts and relationships, while technical acceptance, document release and formal decisions remain explicitly assigned to the appropriate people and organisations.`,
    `This approach makes the difference between available, reviewed and completed information easier to see. A present file is not automatically suitable, and a completed record is not automatically formally accepted; those distinctions remain visible for review.`,
    `During a demo or trial, the team can compare this workflow with current practice. Roles, approved procedures, reporting needs and evidence handling provide a more useful evaluation than a general feature list.`
  ];
  const evaluationSections = nl ? [
    ['Invoering in een bestaand kwaliteitsproces', ['Een praktische invoering begint met rollen, projectstructuur, lasnummering en de momenten waarop inspectiegegevens worden beoordeeld.', 'Bestaande formulieren en rapportagewensen kunnen worden vergeleken met de digitale werkstroom voordat teams breed starten.', 'Een beperkte eerste projectgroep helpt om afspraken over status, bewijs en opvolging concreet te maken.']],
    ['Waarop letten tijdens demo en proefperiode', ['Beoordeel niet alleen hoe snel een record kan worden ingevoerd, maar ook hoe gemakkelijk een collega de context later kan begrijpen.', 'Controleer of foto’s, documenten, open acties en verantwoordelijkheden herkenbaar blijven bij de juiste las.', 'Betrek inspectie, QA/QC, lascoördinatie en documentatie bij de evaluatie zodat de hele overdrachtsketen wordt bekeken.']]
  ] : [
    ['Implementation within an existing quality process', ['A practical implementation starts with roles, project structure, weld identification and the moments at which inspection records are reviewed.', 'Existing forms and reporting needs can be compared with the digital workflow before a wider rollout.', 'A limited first project group helps the organisation make status, evidence and follow-up conventions explicit.']],
    ['What to evaluate during a demo and trial', ['Review more than the speed of data entry; check whether another team member can understand the record later without extra explanation.', 'Confirm that photos, documents, open actions and responsibilities remain recognisable beside the correct weld.', 'Include inspection, QA/QC, welding coordination and documentation roles so the full handover chain is evaluated.']]
  ];
  const allSections = [...page.sections, ...evaluationSections];
  const sectionHtml = allSections.map(([title, points], index) => `<article class="search-section-card"><h2>${title}</h2><p>${points.join(' ')}</p><p>${contextParagraphs[index % contextParagraphs.length]}</p></article>`).join('');
  const nlRouteNames = {'/platform':'Platformoverzicht','/reports':'Rapportage en overdracht','/standards':'Normcontext','/contact':'Contact','/trial':'Start proefperiode'};
  const related = page.related.map((route) => `<a href="${route}">${nl ? (nlRouteNames[route] || names[route]) : names[route] || route.slice(1).replaceAll('-', ' ')}<span>${nl ? 'Bekijk de verwante werkstroom en projectcontext.' : 'Explore the related workflow and project context.'}</span></a>`).join('');
  const faqHtml = page.faqs.map(([question, answer], index) => `<details${index === 0 ? ' open' : ''}><summary>${question}</summary><p>${answer}</p></details>`).join('');
  const disclaimer = nl ? nlDisclaimer : enDisclaimer;
  return `<!doctype html>
<html lang="${page.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${page.title}</title>
  <meta name="description" content="${page.description}">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="${page.lang}" href="${url}">
${page.alternate ? `  <link rel="alternate" hreflang="${nl ? 'en' : 'nl'}" href="${alt}">\n` : ''}
  <link rel="alternate" hreflang="x-default" href="${nl ? alt : url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${page.description}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${base}/assets/images/logo-banner.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#071426">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/enterprise.css">
  <link rel="stylesheet" href="/assets/css/super-premium.css">
  <link rel="stylesheet" href="/assets/css/search-landings.css">
  <script type="application/ld+json">${schema(page)}</script>
</head>
<body>
${header(page.lang)}
<main>
  <section class="search-hero"><div class="container search-hero-grid"><div><p class="kicker">${page.kicker}</p><h1>${page.h1}</h1><p class="lead">${page.intro}</p><div class="hero-actions"><a class="btn btn-primary btn-large" href="${demo}">${nl ? 'Plan demo' : 'Book a Demo'}</a><a class="btn btn-outline btn-large" href="${trial}">${nl ? 'Start proefperiode' : 'Start Free Trial'}</a></div></div><div class="search-visual"><img src="/assets/images/visuals/${page.image}" alt="${page.alt}" width="1200" height="760"></div></div></section>
  <section class="section"><div class="container"><div class="search-intro"><span class="kicker">${nl ? 'Verbonden projectinformatie' : 'Connected project information'}</span><h2>${nl ? 'Van registratie naar beoordeling en overdracht' : 'From field record to review and handover'}</h2><p>${page.intro} ${nl ? 'De software ondersteunt vindbaarheid, opvolging en rapportagevoorbereiding, terwijl technische en formele beslissingen bij bevoegde personen blijven.' : 'The software supports retrieval, follow-up and reporting preparation while technical and formal decisions remain with qualified personnel.'}</p></div><div class="search-sections">${sectionHtml}</div><div class="search-disclaimer">${disclaimer}</div></div></section>
  <section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Verwante werkstromen' : 'Related workflows'}</span><h2>${nl ? 'Bekijk de volgende stap in de projectdocumentatie' : 'Continue through the connected documentation workflow'}</h2></div><div class="search-related">${related}</div></div></section>
  <section class="section"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Veelgestelde vragen' : 'Frequently asked questions'}</span><h2>${nl ? 'Praktische vragen over inzet en verantwoordelijkheid' : 'Practical questions about use and responsibility'}</h2></div><div class="search-faq">${faqHtml}</div></div></section>
  <section class="final-cta visual-cta"><div class="container final-panel"><div><h2>${nl ? 'Bekijk hoe de werkstroom bij uw projecten past' : 'See how the workflow fits your projects'}</h2><p>${nl ? 'Plan een demo, start een proefperiode of bespreek de huidige documentatiewerkwijze met ons team.' : 'Book a demo, start a trial or discuss your current documentation workflow with our team.'}</p></div><div class="final-actions"><a class="btn btn-primary btn-large" href="${demo}">${nl ? 'Plan demo' : 'Book a Demo'}</a><a class="btn btn-outline btn-large" href="${trial}">${nl ? 'Start proefperiode' : 'Start Free Trial'}</a><a class="btn btn-ghost btn-large" href="${contact}">${nl ? 'Neem contact op' : 'Contact us'}</a><a class="text-link" href="${platform}">${nl ? 'Bekijk platform' : 'View platform'}</a></div></div></section>
</main>
${footer(page.lang)}
<script src="/assets/js/site.js"></script>
<script src="/assets/js/enterprise.js"></script>
</body>
</html>`.replace(/^[ \t]+$/gm, '');
}

function titleFor(page) {
  return page.lang === 'nl' ? page.kicker.toLowerCase() : page.kicker.toLowerCase();
}

for (const page of pages) {
  const file = `${page.route.slice(1)}.html`;
  const index = join(page.route.slice(1), 'index.html');
  const html = pageHtml(page);
  mkdirSync(join(root, dirname(index)), {recursive:true});
  writeFileSync(join(root, file), html);
  writeFileSync(join(root, index), html);
}

const footerTargets = [
  'index.html', 'platform.html', 'inspections.html', 'reports.html', 'standards.html', 'resources.html',
  'pricing.html', 'demo.html', 'trial.html', 'contact.html', 'nl/index.html', 'nl/demo.html',
  'nl/trial.html', 'nl/contact.html', 'nl/blog/index.html'
];
for (const file of footerTargets) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  let html = readFileSync(path, 'utf8');
  html = html.replace(/<footer\b[\s\S]*?<\/footer>/i, footer(file.startsWith('nl/') ? 'nl' : 'en'));
  if (!html.includes('/assets/css/search-landings.css')) {
    html = html.replace('</head>', '<link rel="stylesheet" href="/assets/css/search-landings.css">\n</head>');
  }
  writeFileSync(path, html);
  const routeIndex = file === 'index.html' ? null : file.replace(/\.html$/, '/index.html');
  if (routeIndex && existsSync(join(root, routeIndex))) writeFileSync(join(root, routeIndex), html);
}

const linkBands = {
  'index.html': [
    ['/en-1090-software','EN 1090 software'], ['/weld-inspection-software','Weld inspection software'],
    ['/ce-dossier-software','CE dossier software'], ['/weld-inspection-app','Weld inspection app'],
    ['/nl/en-1090-software','EN 1090 software in het Nederlands'], ['/nl/lasinspectie-software','Nederlandse lasinspectie software']
  ],
  'platform.html': pages.map((page) => [page.route, page.h1]),
  'inspections.html': [
    ['/weld-inspection-software','Weld inspection software'], ['/weld-inspection-app','Weld inspection app'],
    ['/welding-inspection-checklist','Welding inspection checklist'], ['/nl/lasinspectie-software','Lasinspectie software'],
    ['/nl/lascontrole-software','Lascontrole software']
  ],
  'standards.html': [
    ['/en-1090-software','EN 1090 software'], ['/wps-wpqr-software','WPS/WPQR software'],
    ['/ce-dossier-software','CE dossier software'], ['/nl/en-1090-software','Nederlandse EN 1090 software']
  ],
  'reports.html': [['/ce-dossier-software','CE dossier software'], ['/nl/ce-dossier-software','Nederlandse CE-dossier software']]
};
for (const [file, links] of Object.entries(linkBands)) {
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  const band = `<section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">Connected solutions</span><h2>Explore workflows for inspection and project documentation</h2><p>Continue from the current product area to focused guidance for weld inspection, standards context and dossier preparation.</p></div><div class="search-related">${links.map(([href,label]) => `<a href="${href}">${label}<span>View the connected workflow and practical project context.</span></a>`).join('')}</div></div></section>`;
  if (!html.includes('Explore workflows for inspection and project documentation')) {
    html = html.replace('</main>', `${band}</main>`);
  }
  writeFileSync(path, html);
  const routeIndex = file.replace(/\.html$/, '/index.html');
  if (existsSync(join(root, routeIndex))) writeFileSync(join(root, routeIndex), html);
}

const resourceCards = [
  ['/en-1090-software','EN 1090 software guide','Connect inspections, procedure context, evidence and dossier preparation.'],
  ['/weld-inspection-software','Weld inspection software guide','Organise weld records, findings, photos and QA/QC follow-up.'],
  ['/weld-inspection-app','Weld inspection app guide','Capture field records and keep review context connected.'],
  ['/welding-inspection-checklist','Welding inspection checklist','Manage checklist status, evidence and open actions.'],
  ['/ce-dossier-software','CE dossier software guide','Prepare project documentation while execution is active.'],
  ['/wps-wpqr-software','WPS/WPQR documentation guide','Keep procedure references linked to projects and welds.'],
  ['/material-traceability-software','Material traceability in steel construction','Connect material records, certificates and project context.'],
  ['/resources/linking-inspection-photos-to-weld-records','Inspection evidence and photo records','Keep field evidence identifiable and useful for review.'],
  ['/qa-qc-software-welding','QA/QC workflow for welding projects','Coordinate inspection status, findings and responsible review.'],
  ['/reports','Reporting and handover checklist','Prepare maintained records for reporting and project handover.']
];
const nlCards = [
  ['/nl/en-1090-software','EN 1090 software kiezen','Beoordeel hoe inspecties, bewijs en dossieropbouw verbonden blijven.'],
  ['/nl/lasinspectie-software','Lasinspectie software voor staalbouw','Leg inspecties, foto’s, bevindingen en opvolging vast.'],
  ['/nl/lascontrole-software','Lascontrole software in de praktijk','Beheer controlepunten, herstelacties en projectstatus.'],
  ['/nl/las-controle-app','Las controle app voor de werkvloer','Registreer mobiele inspecties direct bij de juiste las.'],
  ['/nl/digitale-lasinspectie','Digitale lasinspectie organiseren','Verbind lasregister, inspectieverslag, review en overdracht.'],
  ['/nl/ce-dossier-software','CE-dossier software voor staalbouw','Bereid projectdocumentatie tijdens uitvoering voor.'],
  ['/nl/wps-wpqr-software','WPS/WPQR-documentatie koppelen','Houd procedurecontext zichtbaar bij projecten en lassen.'],
  ['/nl/materiaaltraceerbaarheid','Materiaaltraceerbaarheid in staalbouwprojecten','Verbind certificaten, heatnummers en projectbewijs.'],
  ['/nl/blog/inspectiefotos-koppelen-aan-lasrecords','Inspectiefoto’s als bruikbaar bewijs','Bewaar foto’s met herkenbare las- en inspectiecontext.'],
  ['/nl/blog/rapportage-tijdens-uitvoering','Rapportage en overdracht voorbereiden','Werk vanuit onderhouden records naar een beheerste overdracht.']
];
function addHub(file, title, intro, cards) {
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  const band = `<section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">${file.startsWith('nl/') ? 'Kennisbank' : 'Resource hub'}</span><h2>${title}</h2><p>${intro}</p></div><div class="search-related">${cards.map(([href,name,text]) => `<a href="${href}">${name}<span>${text}</span></a>`).join('')}</div></div></section>`;
  if (!html.includes(title)) html = html.replace('</main>', `${band}</main>`);
  writeFileSync(path, html);
  const counterpart = file.endsWith('/index.html') ? null : file.replace(/\.html$/, '/index.html');
  if (counterpart && existsSync(join(root, counterpart))) writeFileSync(join(root, counterpart), html);
}
addHub('resources.html', 'Guides for connected weld inspection documentation', 'Use these practical routes to evaluate workflows for field inspection, standards context, evidence, reporting and handover.', resourceCards);
addHub('nl/blog/index.html', 'Praktische kennis voor lasinspectie en staalbouwdocumentatie', 'Verdiep u in werkstromen voor inspecties, lascontrole, procedurecontext, traceerbaarheid, rapportage en dossieropbouw.', nlCards);
writeFileSync(join(root, 'nl/blog.html'), readFileSync(join(root, 'nl/blog/index.html'), 'utf8'));

const redirectsPath = join(root, '_redirects');
let redirects = readFileSync(redirectsPath, 'utf8').trimEnd();
for (const page of pages) {
  const rule = `${page.route}.html ${page.route} 301`;
  if (!redirects.includes(rule)) redirects += `\n${rule}`;
}
writeFileSync(redirectsPath, `${redirects}\n`);

const canonicalRoutes = new Set(['/','/platform','/inspections','/reports','/standards','/resources','/pricing','/demo','/trial','/contact','/security','/use-cases','/case-studies','/privacy','/terms','/legal','/dpa','/nl/','/nl/prijzen','/nl/demo','/nl/trial','/nl/contact','/nl/blog/']);
for (const page of pages) canonicalRoutes.add(page.route);
function htmlFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) files.push(...htmlFiles(absolute));
    else if (entry.endsWith('.html')) files.push(absolute);
  }
  return files;
}
for (const file of htmlFiles(root)) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<link rel="canonical" href="https:\/\/weldinspectpro\.com([^"]*)"/g)) {
    const route = (match[1] || '/').replace(/\.html$/, '');
    const excluded = ['/checkout', '/nl/checkout', '/contact-v2', '/nl/contact-v2', '/nl/betaling-gelukt', '/nl/betaling-geannuleerd'];
    if (!route.includes('#') && !route.includes('?') && !excluded.includes(route)) canonicalRoutes.add(route);
  }
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...canonicalRoutes].sort().map((route) => `  <url><loc>${base}${route}</loc><lastmod>${date}</lastmod></url>`).join('\n')}\n</urlset>\n`;
writeFileSync(join(root, 'sitemap.xml'), sitemap);

console.log(`Built ${pages.length} search landing pages and updated shared discovery surfaces.`);
