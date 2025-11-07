From Wikipedia, the free encyclopedia

Condition that must be satisfied for an engineered work to be acceptable

This article is about product and process development. For other kinds of requirements, see [Need](/wiki/Need "Need"), [Obligation](/wiki/Obligation "Obligation"), and [Intelligence requirement](/wiki/Intelligence_requirement "Intelligence requirement"). For historical usage, see [Spanish Requirement of 1513](/wiki/Spanish_Requirement_of_1513 "Spanish Requirement of 1513").

In [engineering](/wiki/Engineering "Engineering"), a **requirement** is a condition that must be satisfied for the output of a work effort to be acceptable. It is an explicit, objective, clear and often quantitative description of a condition to be satisfied by a material, design, product, or service.[[1]](#cite_note-1)

A [specification](/wiki/Specification "Specification") or spec is a set of requirements that is typically used by developers in the design stage of [product development](/wiki/New_product_development "New product development") and by testers in their verification process.

With [iterative and incremental development](/wiki/Iterative_and_incremental_development "Iterative and incremental development") such as [agile software development](/wiki/Agile_software_development "Agile software development"), requirements are developed in parallel with design and implementation. With the [waterfall model](/wiki/Waterfall_model "Waterfall model"), requirements are completed before design or implementation start.

Requirements are used in many engineering fields including [engineering design](/wiki/Engineering_design "Engineering design"), [system engineering](/wiki/System_engineering "System engineering"), [software engineering](/wiki/Software_engineering "Software engineering"), [enterprise engineering](/wiki/Enterprise_engineering "Enterprise engineering"), [product development](/wiki/New_product_development "New product development"), and process optimization.

Requirement is a relatively broad concept that can describe any necessary or desired function, attribute, capability, characteristic, or quality of a system for it to have value and utility to a customer, organization, user, or other stakeholder.

## Origins of term

[[edit](/w/index.php?title=Requirement&action=edit&section=1 "Edit section: Origins of term")]

The term *requirement* has been in use in the software engineering community since at least the 1960s.[[2]](#cite_note-2)

According to the *Guide to the Business Analysis Body of Knowledge®* version 2 from IIBA (BABOK),[[3]](#cite_note-3) a requirement is:

1. A condition or capability needed by a stakeholder to solve a problem or achieve an objective.
2. A condition or capability that must be met or possessed by a solution or solution component to satisfy a contract, standard, specification, or other formally imposed documents.
3. A documented representation of a condition or capability as in (1) or (2).

This definition is based on IEEE 610.12-1990: IEEE Standard Glossary of Software Engineering Terminology.[[4]](#cite_note-4)

## Product versus process requirements

[[edit](/w/index.php?title=Requirement&action=edit&section=2 "Edit section: Product versus process requirements")]

Requirements can be said to relate to two fields:

* **Product requirements** prescribe properties of a system or product.
* **Process requirements** prescribe activities to be performed by the developing organization. For instance, process requirements could specify the methodologies that must be followed, and constraints that the organization must obey.

Product and process requirements are closely linked; a product requirement could be said to specify the automation required to support a process requirement while a process requirement could be said to specify the activities required to support a product requirement. For example, a maximum development cost requirement (a process requirement) may be imposed to help achieve a maximum sales price requirement (a product requirement); a requirement that the product be maintainable (a product requirement) often is addressed by imposing requirements to follow particular development styles (e.g., [object-oriented programming](/wiki/Object-oriented_programming "Object-oriented programming")), style-guides, or a review/inspection process (process requirements).

## Types of requirements

[[edit](/w/index.php?title=Requirement&action=edit&section=3 "Edit section: Types of requirements")]

Requirements are typically classified into types produced at different stages in a development progression, with the taxonomy depending on the overall model being used. For example, the following scheme was devised by the [International Institute of Business Analysis](/w/index.php?title=International_Institute_of_Business_Analysis&action=edit&redlink=1 "International Institute of Business Analysis (page does not exist)") in their Business Analysis Body of Knowledge[[5]](#cite_note-5) (see also [FURPS](/wiki/FURPS "FURPS") and [Types of requirements](/wiki/Requirements_analysis#Types_of_requirements "Requirements analysis")).

[Architectural requirements](/wiki/System_architecture "System architecture")
:   Architectural requirements explain what has to be done by identifying the necessary integration of system [structure](/wiki/Structure "Structure") and system [behavior](/wiki/Behavior "Behavior"), i.e., [system architecture](/wiki/System_architecture "System architecture") of a system.
:   In [software engineering](/wiki/Software_engineering "Software engineering"), they are called [architecturally significant requirements](/wiki/Architecturally_Significant_Requirements "Architecturally Significant Requirements"), which is defined as those requirements that have a measurable impact on a software system’s [architecture](/wiki/Software_architecture "Software architecture").[[6]](#cite_note-ASR_Chen-6)

[Business requirements](/wiki/Business_requirements "Business requirements")
:   High-level statements of the goals, objectives, or needs of an organization. They usually describe opportunities that an organization wants to realise or problems that they want to solve. Often stated in a [business case](/wiki/Business_case "Business case").

[User (stakeholder) requirements](/wiki/User_requirements_document "User requirements document")
:   Mid-level statements of the needs of a particular stakeholder or group of stakeholders. They usually describe how someone wants to interact with the intended solution. Often acting as a mid-point between the high-level business requirements and more detailed solution requirements.

[Functional (solution) requirements](/wiki/Functional_requirements "Functional requirements")
:   Usually detailed statements of the functions or capabilities, behavior, and information that the solution will perform. Examples include formatting text, calculating a number, modulating a signal. They are also sometimes known as *capabilities*.

[Quality-of-service (non-functional) requirements](/wiki/Non-functional_requirements "Non-functional requirements")
:   Usually detailed statements of the conditions under which the solution must remain effective, qualities that the solution must have, or constraints within which it must operate.[[7]](#cite_note-7) Examples include: reliability, testability, maintainability, availability. They are also known as *characteristics*, *constraints* or the *[ilities](/wiki/Ilities "Ilities").*

[Implementation (transition) requirements](/wiki/Implementation "Implementation")
:   Usually, detailed statements of capabilities or behavior required only to enable the transition from the current state of the enterprise to the desired future state, but that will thereafter no longer be required. Examples include recruitment, role changes, education, migration of data from one system to another.

[Regulatory requirements](/wiki/Regulation "Regulation")
:   Requirements defined by [laws](/wiki/Law "Law") (Federal, State, Municipal, or Regional), [contracts](/wiki/Contract "Contract") (terms and conditions), or  [policies](/wiki/Policy "Policy") (company, departmental, or project-level).

## Characteristics of good requirements

[[edit](/w/index.php?title=Requirement&action=edit&section=4 "Edit section: Characteristics of good requirements")]

The characteristics of good requirements are variously stated by different writers, with each writer generally emphasizing the characteristics most appropriate to their general discussion or the specific technology domain being addressed. However, the following characteristics are generally acknowledged.[[8]](#cite_note-Davis93-8)
[[9]](#cite_note-IEEE_830-1998_standard-9)

| Characteristic | Explanation |
| --- | --- |
| Unitary (Cohesive) | The requirement addresses one and only one thing. |
| Complete | The requirement is fully stated in one place with no missing information. |
| [Consistent](/wiki/Consistency "Consistency") | The requirement does not contradict any other requirement and is fully consistent with all authoritative external documentation. |
| Non-Conjugated ([Atomic](/wiki/Atomicity_(database_systems) "Atomicity (database systems)")) | The requirement is *atomic*, i.e., it does not contain conjunctions. E.g., "The postal code field must validate American *and* Canadian postal codes" should be written as two separate requirements: (1) "The postal code field must validate American postal codes" and (2) "The postal code field must validate Canadian postal codes". |
| [Traceable](/wiki/Traceability "Traceability") | The requirement meets all or part of a business need as stated by stakeholders and authoritatively documented. |
| Current | The requirement has not been made obsolete by the passage of time. |
| [Unambiguous](/wiki/Unambiguous "Unambiguous") | The requirement is concisely stated without recourse to [technical jargon](/wiki/Technical_jargon "Technical jargon"), [acronyms](/wiki/Acronym "Acronym") (unless defined elsewhere in the Requirements document), or other esoteric verbiage. It expresses objective facts, not subjective opinions. It is subject to one and only one interpretation. Vague subjects, adjectives, prepositions, verbs and subjective phrases are avoided. Negative statements and compound statements are avoided. |
| Specify Importance | Many requirements represent a stakeholder-defined characteristic the absence of which will result in a major or even fatal deficiency. Others represent features that may be implemented if time and budget permits. The requirement must specify a level of importance. |
| [Verifiable](/wiki/Verification_and_validation "Verification and validation") | The implementation of the requirement can be determined through basic possible methods: inspection, demonstration, test (instrumented) or analysis (to include validated modeling & simulation). |

There are many more attributes to consider that contribute to the quality of requirements. If requirements are subject to rules of [data integrity](/wiki/Data_integrity "Data integrity") (for example) then accuracy/correctness and validity/authorization are also worthy attributes. [Traceability](/wiki/Traceability "Traceability") confirms that the requirement set satisfies the need (no more - and no less than what is required).

To the above some add Externally Observable, that is, the requirement specifies a characteristic of the product that is externally observable or experienced by the user. Such advocates argue that requirements that specify internal architecture, design, implementation, or testing decisions are probably constraints, and should be clearly articulated in the Constraints section of the Requirements document. The contrasting view is that this perspective fails on two points. First, the perspective does not recognize that the user experience may be supported by requirements not perceivable by the user. For example, a requirement to present [geocoded](/wiki/Geocoding "Geocoding") information to the user may be supported by a requirement for an interface with an external third party business partner. The interface will be imperceptible to the user, though the presentation of information obtained through the interface certainly would not. Second, a constraint limits design alternatives, whereas a requirement specifies design characteristics. To continue the example, a requirement selecting a web service interface is different from a constraint limiting design alternatives to methods compatible with a Single Sign-On architecture.

### Verification

[[edit](/w/index.php?title=Requirement&action=edit&section=5 "Edit section: Verification")]

All requirements should be verifiable. The most common method is by test. If this is not the case, another verification method should be used instead (e.g. analysis, demonstration, inspection, or review of design).

Certain requirements, by their very structure, are not verifiable. These include requirements that say the system must *never* or *always* exhibit a particular property. Proper testing of these requirements would require an infinite testing cycle. Such requirements must be rewritten to be verifiable. As stated above all requirements must be verifiable.

Non-functional requirements, which are unverifiable at the software level, must still be kept as a documentation of customer intent. However, they may be traced to process requirements that are determined to be a practical way of meeting them. For example, a non-functional requirement to be free from [backdoors](/wiki/Backdoor_(computing) "Backdoor (computing)") may be satisfied by replacing it with a process requirement to use [pair programming](/wiki/Pair_programming "Pair programming"). Other non-functional requirements will trace to other system components and be verified at that level. For example, system reliability is often verified by analysis at the system level. [Avionics software](/wiki/Avionics_software "Avionics software") with its complicated safety requirements must follow the [DO-178B](/wiki/DO-178B "DO-178B") development process.

Activities that lead to the derivation of the system or software requirements. Requirements engineering may involve a [feasibility study](/wiki/Feasibility_study "Feasibility study") or a *conceptual analysis phase* of the project and [requirements elicitation](/wiki/Requirements_elicitation "Requirements elicitation") (gathering, understanding, reviewing, and articulating the needs of the [stakeholders](/wiki/Stakeholder_(corporate) "Stakeholder (corporate)")) and [requirements analysis](/wiki/Requirements_analysis "Requirements analysis"),[[10]](#cite_note-10) [analysis](/wiki/Requirements_analysis "Requirements analysis") (checking for consistency and completeness), specification (documenting the requirements) and validation (making sure the specified requirements are correct).[[11]](#cite_note-Wiegers03-11)[[12]](#cite_note-Young01-12)

Requirements are prone to issues of ambiguity, incompleteness, and inconsistency. Techniques such as rigorous [inspection](/wiki/Software_inspection "Software inspection") have been shown to help deal with these issues. Ambiguities, incompleteness, and inconsistencies that can be resolved in the requirements phase typically cost orders of magnitude less to correct than when these same issues are found in later stages of product development. Requirements analysis strives to address these issues.

There is an engineering trade off to consider between requirements which are too vague, and those which are so detailed that they

* take a long time to produce - sometimes to the point of being obsolete once completed
* limit the implementation options available
* are costly to produce

[Agile approaches](/wiki/Agile_software_development "Agile software development") evolved as a way of overcoming these problems, by baselining requirements at a high-level, and elaborating detail on a [just-in-time](/wiki/Just_in_time_(business) "Just in time (business)") or *last responsible moment* basis.

## Documenting requirements

[[edit](/w/index.php?title=Requirement&action=edit&section=6 "Edit section: Documenting requirements")]

Requirements are usually written as a means for communication between the different stakeholders. This means that the requirements should be easy to understand both for normal users and for developers. One common way to document a requirement is stating what the system must do. Example: 'The contractor must deliver the product no later than xyz date.' Other methods include [use cases](/wiki/Use_cases "Use cases") and [user stories](/wiki/User_stories "User stories").

## Changes in requirements

[[edit](/w/index.php?title=Requirement&action=edit&section=7 "Edit section: Changes in requirements")]

Requirements generally change with time. Once defined and approved, requirements should fall under [change control](/wiki/Change_control "Change control"). For many projects, requirements are altered before the system is complete. This is partly due to the complexity of computer software and the fact that users don't know what they want before they see it. This characteristic of requirements has led to [requirements management](/wiki/Requirements_management "Requirements management") studies and practices.

## Issues

[[edit](/w/index.php?title=Requirement&action=edit&section=8 "Edit section: Issues")]

### Competing standards

[[edit](/w/index.php?title=Requirement&action=edit&section=9 "Edit section: Competing standards")]

There are several competing views of what requirements are and how they should be managed and used. Two leading bodies in the industry are the IEEE and the IIBA. Both of these groups have different but similar definitions of what a requirement is.

### Disputes regarding the necessity and effects of software requirements

[[edit](/w/index.php?title=Requirement&action=edit&section=10 "Edit section: Disputes regarding the necessity and effects of software requirements")]

Many projects have succeeded with little or no agreement on requirements.[[13]](#cite_note-13) Some evidence furthermore indicates that specifying requirements can decrease [creativity](/wiki/Creativity "Creativity") and design performance [[14]](#cite_note-14) Requirements hinder creativity and design because designers become overly preoccupied with provided information.[[15]](#cite_note-15)[[16]](#cite_note-16)[[17]](#cite_note-17) More generally, some research suggests that software requirements are an [illusion](/wiki/Illusion "Illusion") created by misrepresenting design decisions as requirements in situations where no real requirements are evident.[[18]](#cite_note-18)

Meanwhile, most [agile software development](/wiki/Agile_software_development "Agile software development") methodologies question the need for rigorously describing software requirements upfront, which they consider a moving target. Instead, [extreme programming](/wiki/Extreme_programming "Extreme programming") for example describes requirements informally using [user stories](/wiki/User_story "User story") (short summaries fitting on an index card explaining one aspect of what the system should do), and considers it the developer's duty to directly ask the customer for clarification. Agile methodologies attempt to capture requirements in a series of automated [acceptance tests](/wiki/Acceptance_test "Acceptance test").

### Requirements creep

[[edit](/w/index.php?title=Requirement&action=edit&section=11 "Edit section: Requirements creep")]

[Scope creep](/wiki/Scope_creep "Scope creep") may occur from requirements moving over time. In [Requirements management](/wiki/Requirements_management "Requirements management") the alteration of requirements is allowed but if not adequately tracked or preceding steps (business goals then user requirements) are not throttled by additional oversight or handled as a cost and potential program failure, then requirements changes are easy and likely to happen. It is easy for requirement changes to occur faster than developers are able to produce work, and the effort to go *backwards* as a result.

### Multiple requirements taxonomies

[[edit](/w/index.php?title=Requirement&action=edit&section=12 "Edit section: Multiple requirements taxonomies")]

There are multiple taxonomies for requirements depending on which framework one is operating under. (For example, the stated standards of IEEE, vice IIBA or U.S. DoD approaches). Differing language and processes in different venues or casual speech can cause confusion and deviation from desired process.

### Process corruptions

[[edit](/w/index.php?title=Requirement&action=edit&section=13 "Edit section: Process corruptions")]

A process being run by humans is subject to human flaws in governance, where convenience or desires or politics may lead to exceptions or outright subversion of the process and deviations from the textbook way the process is supposed to proceed. Examples include:

* Process with no rigor gets no respect - If exceptions or changes are common, such as the organization running it having little independence or power or not being reliable and transparent in records, it may lead to the overall process being ignored.
* New players wanting a do-over - e.g., The natural tendency of new people to want to change their predecessor's work to demonstrate their power or claims of value, such as a new CEO wanting to change the previous CEO's planning, including business goals, of something (such as a software solution) already in development, or a newly created office objects to current development of a project because they did not exist when user requirements were crafted, so they begin an effort to backtrack and re-baseline the project.
* Coloring outside the lines - e.g., Users wanting more control do not just input things that meet the requirements management definition of "user requirement" or priority level, but insert design details or favored vendor characteristic as user requirements or everything their office says as the highest possible priority.
* Showing up late - e.g., Doing little or no effort in requirements elicitation prior to development. This may be due to thinking they will get the same benefit regardless of individual participation, or that there is no point if they can just insert demands at the testing stage and next spin, or the preference to be always right by waiting for post-work critique.

Within the U.S. Department of Defense process, some historical examples of requirements issues are

* the M-2 Bradley issues of casual requirements movement portrayed in [Pentagon Wars](/wiki/Pentagon_Wars "Pentagon Wars");
* the F-16 growth from lightweight fighter concept of the [Fighter mafia](/wiki/Fighter_mafia "Fighter mafia"), attributed to F-15 program attempting to sabotage competition or individual offices putting in local desires eroding the concept of being lightweight and low cost.
* enthusiasm ca. 1998 for 'Net-Ready' led to its mandate as Key Performance Parameter from the Net-Ready office, outside the office defining requirements process and not consistent to that office's previously defined process, their definition of what a KPP was, or that some efforts might not be appropriate or able to define what constituted 'Net-Ready'.

## See also

[[edit](/w/index.php?title=Requirement&action=edit&section=14 "Edit section: See also")]

* [Business requirements](/wiki/Business_requirements "Business requirements")
* [Software requirements](/wiki/Software_requirements "Software requirements")
* [Requirements engineering](/wiki/Requirements_engineering "Requirements engineering")
* [Requirements analysis](/wiki/Requirements_analysis "Requirements analysis")
* [Requirements elicitation](/wiki/Requirements_elicitation "Requirements elicitation")
* [Requirements management](/wiki/Requirements_management "Requirements management")
* [Requirement prioritization](/wiki/Requirement_prioritization "Requirement prioritization")
* [Requirements traceability](/wiki/Requirements_traceability "Requirements traceability")
* [Specification (technical standard)](/wiki/Specification_(technical_standard) "Specification (technical standard)")
* [Shall and will](/wiki/Shall_and_will#Technical_specifications "Shall and will") - phrasing
* [MoSCoW Method](/wiki/MoSCoW_Method "MoSCoW Method") - prioritisation technique
* [User Story](/wiki/User_story "User story")
* [Use Case](/wiki/Use_Case "Use Case")

## References

[[edit](/w/index.php?title=Requirement&action=edit&section=15 "Edit section: References")]

1. **[^](#cite_ref-1 "Jump up")** [*Form and Style of Standards, ASTM Blue Book*](https://web.archive.org/web/20151106210652/http://www.astm.org/COMMIT/Blue_Book.pdf) . [ASTM International](/wiki/ASTM_International "ASTM International"). 2012. Archived from [the original](http://www.astm.org/COMMIT/Blue_Book.pdf) on 6 November 2015. Retrieved 5 January 2013.
2. **[^](#cite_ref-2 "Jump up")** Boehm, Barry (2006). ["A view of 20th and 21st century software engineering"](http://dl.acm.org/citation.cfm?id=1134288). *ICSE '06 Proceedings of the 28th international conference on Software engineering*. University of Southern California, University Park Campus, Los Angeles, CA: Association for Computing Machinery, ACM New York, NY, USA. pp. 12–29. [ISBN](/wiki/ISBN_(identifier) "ISBN (identifier)") [1-59593-375-1](/wiki/Special:BookSources/1-59593-375-1 "Special:BookSources/1-59593-375-1"). Retrieved January 2, 2013.
3. **[^](#cite_ref-3 "Jump up")** ["1.3 Key Concepts - IIBA | International Institute of Business Analysis"](http://www.iiba.org/babok-guide/babok-guide-v2/babok-guide-online/chapter-one-introduction/1-3-key-concepts.aspx). *www.iiba.org*. Retrieved 2016-09-25.
4. **[^](#cite_ref-4 "Jump up")** ["IEEE SA - 610.12-1990 - IEEE Standard Glossary of Software Engineering Terminology"](https://web.archive.org/web/20110110043912/http://standards.ieee.org/findstds/standard/610.12-1990.html). Archived from [the original](http://standards.ieee.org/findstds/standard/610.12-1990.html) on January 10, 2011.
5. **[^](#cite_ref-5 "Jump up")** Iiba; Analysis, International Institute of Business (2009). [*A Guide to the Business Analysis Body of Knowledge® (BABOK® Guide) Version 2.0*](http://IIBA.org). [ISBN](/wiki/ISBN_(identifier) "ISBN (identifier)") [978-0-9811292-1-1](/wiki/Special:BookSources/978-0-9811292-1-1 "Special:BookSources/978-0-9811292-1-1").
6. **[^](#cite_ref-ASR_Chen_6-0 "Jump up")** Chen, Lianping; Ali Babar, Muhammad; Nuseibeh, Bashar (2013). "Characterizing Architecturally Significant Requirements". *IEEE Software*. **30** (2): 38–45. [doi](/wiki/Doi_(identifier) "Doi (identifier)"):[10.1109/MS.2012.174](https://doi.org/10.1109%2FMS.2012.174). [hdl](/wiki/Hdl_(identifier) "Hdl (identifier)"):[10344/3061](https://hdl.handle.net/10344%2F3061). [S2CID](/wiki/S2CID_(identifier) "S2CID (identifier)") [17399565](https://api.semanticscholar.org/CorpusID:17399565).
7. **[^](#cite_ref-7 "Jump up")** Ralph, P., and Wand, Y. A Proposal for a Formal Definition of the Design Concept. In, Lyytinen, K., Loucopoulos, P., [Mylopoulos, J.](/wiki/John_Mylopoulos "John Mylopoulos"), and Robinson, W., (eds.), Design Requirements Engineering: A Ten-Year Perspective: Springer-Verlag, 2009, pp. 103-136
8. **[^](#cite_ref-Davis93_8-0 "Jump up")** Davis, Alan M. (1993). [*Software Requirements: Objects, Functions, and States, Second Edition*](https://archive.org/details/softwarerequirem0000davi). Prentice Hall. [ISBN](/wiki/ISBN_(identifier) "ISBN (identifier)") [978-0-13-805763-3](/wiki/Special:BookSources/978-0-13-805763-3 "Special:BookSources/978-0-13-805763-3").
9. **[^](#cite_ref-IEEE_830-1998_standard_9-0 "Jump up")** IEEE Computer Society (1998). *IEEE Recommended Practice for Software Requirements Specifications*. Institute of Electrical and Electronics Engineers, Inc. [ISBN](/wiki/ISBN_(identifier) "ISBN (identifier)") [978-0-7381-0332-7](/wiki/Special:BookSources/978-0-7381-0332-7 "Special:BookSources/978-0-7381-0332-7").
10. **[^](#cite_ref-10 "Jump up")** Stellman, Andrew; Greene, Jennifer (2005). [*Applied Software Project Management*](https://web.archive.org/web/20150209011617/http://www.stellman-greene.com/aspm/). O'Reilly Media. p. 98. [ISBN](/wiki/ISBN_(identifier) "ISBN (identifier)") [978-0-596-00948-9](/wiki/Special:BookSources/978-0-596-00948-9 "Special:BookSources/978-0-596-00948-9"). Archived from [the original](http://www.stellman-greene.com/aspm/) on 2015-02-09.
11. **[^](#cite_ref-Wiegers03_11-0 "Jump up")** Wiegers, Karl E. (2003). *Software Requirements, Second Edition*. Microsoft Press. [ISBN](/wiki/ISBN_(identifier) "ISBN (identifier)") [978-0-7356-1879-4](/wiki/Special:BookSources/978-0-7356-1879-4 "Special:BookSources/978-0-7356-1879-4").
12. **[^](#cite_ref-Young01_12-0 "Jump up")** Young, Ralph R. (2001). [*Effective Requirements Practices*](https://archive.org/details/unset0000unse_g5k2). Addison-Wesley. [ISBN](/wiki/ISBN_(identifier) "ISBN (identifier)") [978-0-201-70912-4](/wiki/Special:BookSources/978-0-201-70912-4 "Special:BookSources/978-0-201-70912-4").
13. **[^](#cite_ref-13 "Jump up")** Checkland, Peter (1999). *System Thinking, System Practice*. Chichester: Wiley.
14. **[^](#cite_ref-14 "Jump up")** 
    Ralph, Paul; Mohanani, Rahul (May 2015). ["Is Requirements Engineering Inherently Counterproductive?"](https://www.researchgate.net/publication/272793687). *Proceedings of the 5th International Workshop on the Twin Peaks of Requirements and Architecture*. Florence, Italy: IEEE. pp. 20–23.
15. **[^](#cite_ref-15 "Jump up")** Jansson, D.; Smith, S. (1991). "Design fixation". *Design Studies*. **12** (1): 3–11. [doi](/wiki/Doi_(identifier) "Doi (identifier)"):[10.1016/0142-694X(91)90003-F](https://doi.org/10.1016%2F0142-694X%2891%2990003-F).
16. **[^](#cite_ref-16 "Jump up")** Purcell, A.; Gero, J. (1996). "Design and other types of fixation". *Design Studies*. **17** (4): 363–383. [doi](/wiki/Doi_(identifier) "Doi (identifier)"):[10.1016/S0142-694X(96)00023-3](https://doi.org/10.1016%2FS0142-694X%2896%2900023-3).
17. **[^](#cite_ref-17 "Jump up")** 
    Mohanani, Rahul; Ralph, Paul; Shreeve, Ben (May 2014). ["Requirements Fixation"](https://www.researchgate.net/publication/265416695). *Proceedings of the International Conference on Software Engineering*. Hyderabad, India: IEEE. pp. 895–906.
18. **[^](#cite_ref-18 "Jump up")** Ralph, Paul (2012). "The Illusion of Requirements in Software Development". *Requirements Engineering*. **18** (3): 293–296. [arXiv](/wiki/ArXiv_(identifier) "ArXiv (identifier)"):[1304.0116](https://arxiv.org/abs/1304.0116). [doi](/wiki/Doi_(identifier) "Doi (identifier)"):[10.1007/s00766-012-0161-4](https://doi.org/10.1007%2Fs00766-012-0161-4). [S2CID](/wiki/S2CID_(identifier) "S2CID (identifier)") [11499083](https://api.semanticscholar.org/CorpusID:11499083).

## External links

[[edit](/w/index.php?title=Requirement&action=edit&section=16 "Edit section: External links")]

[![](//upload.wikimedia.org/wikipedia/commons/thumb/9/99/Wiktionary-logo-en-v2.svg/40px-Wiktionary-logo-en-v2.svg.png)](/wiki/File:Wiktionary-logo-en-v2.svg)

Look up ***[requirement](https://en.wiktionary.org/wiki/Special:Search/requirement "wiktionary:Special:Search/requirement")*** in Wiktionary, the free dictionary.

* [*Discovering System Requirements*](http://prod.sandia.gov/techlib/access-control.cgi/1996/961620.pdf)

![](https://en.wikipedia.org/wiki/Special:CentralAutoLogin/start?useformat=desktop&type=1x1&usesul3=1)

Retrieved from "<https://en.wikipedia.org/w/index.php?title=Requirement&oldid=1316117058>"

[Category](/wiki/Help:Category "Help:Category"):

* [Software requirements](/wiki/Category:Software_requirements "Category:Software requirements")

Hidden categories:

* [CS1 errors: generic name](/wiki/Category:CS1_errors:_generic_name "Category:CS1 errors: generic name")
* [Articles with short description](/wiki/Category:Articles_with_short_description "Category:Articles with short description")
* [Short description is different from Wikidata](/wiki/Category:Short_description_is_different_from_Wikidata "Category:Short description is different from Wikidata")