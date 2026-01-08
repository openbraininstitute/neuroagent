# backend/src/neuroagent/app/database/sql_schemas.py  

This part of the system defines how your conversations and messages are stored.  
As an end user, this guarantees that your chat history, message authorship, and tool interactions are consistently tracked.  

- Each **conversation** you see in the interface corresponds to a stored “thread.”  
- Every **message** in a thread is tagged as coming from you, the assistant, or a tool.  
- The application can keep track of how complex a request was and how many tokens it used, which may affect limits or billing.  

---

# backend/src/neuroagent/app/config.py  

This area contains all the configuration that controls how the chatbot behaves in the platform.  
You do not interact with it directly, but it determines available models, tools, rate limits, and integrations.  

- It decides which external data sources and tools are enabled for you.  
- It configures how strict rate limits are and whether accounting or billing is active.  
- It enables or disables additional capabilities like MCP tools or storage integration.  

---

# backend/src/neuroagent/app/dependencies.py  

This part wires together all the building blocks the chatbot needs to answer you.  
You never call these pieces yourself, but they ensure every request carries your identity, project context, and available tools.  

- It injects your **user identity** so the system can check which labs or projects you belong to.  
- It provides connections to **databases**, **storage**, and **external APIs** whenever required.  
- It ensures that each chat request has access to the latest configuration and tools.  

---

# backend/src/neuroagent/app/schemas.py  

These definitions describe what the chatbot sends and receives internally.  
For you, they translate into the shapes of data you see: messages, threads, suggested questions, tool metadata, and so on.  

- They define the structure of **thread summaries**, **message lists**, **rate-limit information**, and **tool descriptions**.  
- They support the features you use, such as listing previous chats, viewing tool calls, or seeing suggestions.  
- They help ensure that responses you see are well-formed and consistent across the application.  

---

# backend/src/neuroagent/app/app_utils.py  

This module provides helper features that directly impact your experience with the chatbot.  
It powers project access checks, rate limiting, and how messages are presented back to you.  

- It verifies that you are allowed to use a given **virtual lab** or **project** before running a query.  
- It enforces **rate limits**, so the chatbot can tell you when you have reached your quota.  
- It assembles messages in convenient formats used by the front-end and for suggested questions.  

---

# backend/src/neuroagent/app/middleware.py  

This middleware adapts incoming requests so the deployed application can work behind different URLs or proxies.  
As an end user, this means the chatbot keeps working even if the platform hosts it under a custom path.  

- It transparently handles any URL prefix that your platform administrator might configure.  
- It helps keep endpoints like health checks and chat routes accessible in different environments.  

---

# backend/src/neuroagent/app/main.py  

This is the central entry point of the chatbot application.  
It is responsible for starting all background services and exposing the features you actually use.  

- It activates logging and request tracking, which help operators debug issues with your conversations.  
- It mounts all main features: chat, tools, threads, rate limits, and storage.  
- It provides health and readiness checks so the hosting platform knows when the chatbot is available.  
- It also exposes a way to inspect global settings, which operators can use to verify configuration.  

---

# backend/src/neuroagent/app/routers/rate_limit.py  

This part defines the **rate limit** endpoint used to inform you how many operations you can still perform.  
The actual limits are decided by your environment, but this is how the chatbot shares them with you.  

- You can ask the system how many **chat requests**, **suggested questions**, or **title generations** you have left.  
- The chatbot answers with counts and approximate reset times so you know when you can send more.  
- Limits may differ when you work **inside** a specific virtual lab and project compared to outside.  

---

# backend/src/neuroagent/app/routers/storage.py  

This route enables the chatbot to give you **temporary download links** to files stored on the platform.  
You do not see the underlying storage details, but you benefit from secure and time-limited access.  

- You can request a **download link** for a file previously generated or stored by tools or the chatbot.  
- The system verifies that the file exists and belongs to you before granting access.  
- The link is valid only for a limited time, improving both **security** and **data privacy**.  

---

# backend/src/neuroagent/app/routers/threads.py  

This router powers all features related to your **conversation history**.  
Whenever you see a list of chats, open a previous thread, or rename a conversation, this code is involved.  

- You can **create** new conversations and link them to a virtual lab and project.  
- You can **search** across your previous messages within a project using keywords.  
- You can **list** all your threads, see their titles, and open any of them.  
- You can **rename** or **delete** a thread; deleting also removes associated stored artifacts when relevant.  
- You can **generate a title** for a thread so it summarizes the conversation.  
- You can **list messages** in a thread in formats suitable for the platform’s UI.  

---

# backend/src/neuroagent/app/routers/qa.py  

This router is at the heart of the **chat experience** you see in the Open Brain Platform.  
It handles both interactive chat and smart features like suggested questions and automatic titles.  

- You can ask the chatbot to **suggest follow-up questions** based on your ongoing conversation.  
- You can send **chat messages** and receive responses in a streamed way, giving you fast partial answers.  
- You can let the chatbot **generate a title** summarizing a conversation.  
- Each of these actions can be associated with a virtual lab and project, which control access and accounting.  

---

# backend/src/neuroagent/app/routers/tools.py  

This router exposes how the chatbot interacts with advanced **tools**.  
It allows the system to run specific tools on your behalf and to show you which tools are available.  

- You can view a **list of available tools**, each with a human-readable description and usage hints.  
- The assistant may propose particular tool calls for your approval when they affect data or actions.  
- You can **accept** or **reject** a tool call; acceptance runs the tool, rejection tells the assistant not to proceed.  
- You can view detailed **metadata** for a specific tool when the UI surfaces it.  

---

# backend/src/neuroagent/rules/README.md  

This document contains internal rules and guidelines used when developing the chatbot.  
As an end user, you do not need to follow these rules, but they influence the quality of your experience.  

- They help ensure consistent naming, behavior, and structure across the chatbot features.  
- They guide maintainers in evolving the system without breaking how you use it.  

---

# backend/src/neuroagent/scripts/compare_results.py  

This script is used internally to compare evaluation results between different chatbot versions.  
You do not run it directly, but it helps maintainers understand if a new version improves or worsens answers.  

- It compares outputs produced by the chatbot on a fixed set of test cases.  
- It highlights where answers changed, which can influence which version you ultimately use.  

---

# backend/src/neuroagent/scripts/evaluate_agent.py  

This script runs large **evaluation campaigns** for the chatbot.  
It is not part of your daily usage but ensures that the deployed model behaves as expected.  

- It runs many predefined test queries against the chatbot.  
- It scores the answers against metrics, which drive improvements and regression checks.  

---

# backend/src/neuroagent/scripts/neuroagent_api.py  

This script is a helper to **start** the chatbot service on a server.  
End users never see it, but it controls where and how the chatbot is exposed.  

- It configures the listening host, port, and environment settings.  
- It is used by operators to bring the service online for you.  

---

# backend/src/neuroagent/tools/autogenerated_types/entitycore.py  

This file contains data descriptions for the **EntityCore** knowledge services the chatbot can call.  
From your perspective, these services power tools that retrieve detailed neuroscience data.  

- Tools can use this to fetch entities like brain regions, cell morphologies, or simulations.  
- It ensures that data returned to you has a consistent structure and meaning.  

---

# backend/src/neuroagent/tools/autogenerated_types/obione.py  

This file describes responses from **OBIONE** services, which focus on simulations and metrics.  
You experience it through tools that analyze or generate simulation-related content.  

- Tools can query for advanced metrics or configurations related to neural circuits.  
- The chatbot can explain or summarize these results in natural language for you.  

---

# backend/src/neuroagent/tools/autogenerated_types/thumbnail_generation.py  

This file defines what data is expected from services that generate **thumbnails and visual previews**.  
You see the effects when the chatbot or tools give you quick visual summaries.  

- For example, a tool may generate a preview image of a morphology or an electrical recording.  
- The chatbot can then provide you with a link or embed to view these previews.  

---

# backend/src/neuroagent/tools/base_tool.py  

This is the common foundation for every **tool** the chatbot can use to extend its capabilities.  
You interact with it indirectly every time the assistant accesses external data or performs a specialized action.  

- It standardizes how tools describe their purpose, inputs, and outputs.  
- It supports health checks, so tools that are offline do not get offered to you.  
- It helps tools integrate with your virtual lab, project, and permissions.  

---

# backend/src/neuroagent/tools/calculator.py  

This tool allows the chatbot to perform **reliable numerical calculations**.  
Whenever you see the assistant compute sums, products, or other operations, this module may be involved.  

- You can ask math questions that require precise results.  
- The assistant can offload complex operations to this tool instead of estimating by language alone.  

---

# backend/src/neuroagent/tools/circuit_population_analysis_tool.py  

This tool gives the chatbot access to **circuit population analysis** features.  
If you ask questions about populations in a neural circuit, this helps provide structured answers.  

- The assistant can summarize properties of neuron populations within a circuit.  
- It can use this tool to ground responses in actual data available on the platform.  

---

# backend/src/neuroagent/tools/context_analyzer_tool.py  

This tool helps the chatbot understand the **context** of your query within a longer conversation.  
It supports better tool selection, model selection, or response style.  

- The chatbot can estimate how complex your request is.  
- It can decide whether to call specialized tools or use more advanced reasoning.  

---

# backend/src/neuroagent/tools/entitycore_*  

All `entitycore_*` tools connect the chatbot to the **EntityCore knowledge graph**.  
They let you query detailed neuroscience data directly from within the chat.  

- You can ask for **brain region** information and hierarchies.  
- You can request **cell morphologies**, **ion channels**, **simulations**, **species**, and more.  
- Some tools find lists of entities; others retrieve **one specific entity** by its ID.  
- Many of them decorate results with links to the Open Brain Institute front-end, so you can explore further.  

---

# backend/src/neuroagent/tools/literature_search.py  

This tool lets the chatbot perform **literature searches** for you.  
When you ask for related scientific papers or references, this tool may be used.  

- The assistant can search external or curated sources based on your topic.  
- It can then summarize key findings or provide links for further reading.  

---

# backend/src/neuroagent/tools/now.py  

This tool gives the chatbot awareness of the **current date and time**.  
It enables time-aware answers without exposing system internals.  

- You can ask “What is the date today?” or time-related questions.  
- The assistant can use this in other tools, like weather or scheduling explanations.  

---

# backend/src/neuroagent/tools/obi_expert.py  

This tool represents a specialized **expert system** for Open Brain Institute contexts.  
You benefit from it when asking nuanced questions about neuroscience workflows or resources.  

- It helps the assistant give more structured and in-depth answers.  
- It can combine contextual knowledge with platform resources.  

---

# backend/src/neuroagent/tools/obione_*  

These tools connect the chatbot to **OBIONE** analytics and simulation services.  
You see them in action when you request detailed analyses or metrics about neural circuits.  

- They can fetch **circuit connectivity metrics** or **morphometric** measurements.  
- They can generate or interpret **simulation configurations** and **execution results**.  

---

# backend/src/neuroagent/tools/random_number.py  

This small tool provides **random numbers** on demand.  
It can be used in playful interactions or simple stochastic reasoning.  

- You might ask the assistant to choose randomly between options.  
- The assistant can call this tool to provide unbiased random choices.  

---

# backend/src/neuroagent/tools/read_paper.py  

This tool lets the chatbot **analyze and summarize scientific papers**, usually from PDFs or linked resources.  
You interact with it when you ask the assistant to explain or summarize a paper.  

- It can extract structured information like methods, results, and conclusions.  
- It helps create lay summaries or technical overviews tailored to your level.  

---

# backend/src/neuroagent/tools/run_python_tool.py  

This tool provides a controlled way for the assistant to **execute Python code** for computation or data wrangling.  
You indirectly use it when asking for small, precise computations beyond simple arithmetic.  

- It supports more specialized data transformations when needed.  
- It is kept under tight control to avoid unsafe operations.  

---

# backend/src/neuroagent/tools/thumbnailgen_electricalcellrecording_getone.py  

This tool creates **visual previews** for electrical cell recordings.  
You see the benefits when the assistant gives you images representing a recording.  

- It can generate plots that capture key aspects of an electrical recording.  
- It saves these images to storage so you can access them via secure links.  

---

# backend/src/neuroagent/tools/thumbnailgen_morphology_getone.py  

This tool generates **morphology thumbnails** for neuron structures.  
You may receive these as quick visuals of the cell shapes you are studying.  

- It produces preview images of morphologies from the platform’s data.  
- The chatbot can then provide you with an identifier or link to view the preview.  

---

# backend/src/neuroagent/tools/timestamp.py  

This tool generates **timestamps**, which the assistant can use to label events or logs.  
You mostly see it when responses mention exact times in a consistent format.  

- It allows the assistant to annotate outputs with precise timing information.  
- It can be used when describing sequences of actions within a project.  

---

# backend/src/neuroagent/tools/weather.py  

This tool lets the assistant fetch **weather information** for a given location.  
You can ask for current conditions or simple forecasts.  

- The assistant can tell you temperature, conditions, and other basic details.  
- It relies on external weather services configured in the platform.  

---

# backend/src/neuroagent/tools/web_search.py  

This tool provides controlled **web search** capabilities.  
You experience it when the assistant brings in recent facts or external links.  

- It helps answer questions that rely on up-to-date information.  
- Its use may be restricted according to platform configuration and policies.  

---

# backend/src/neuroagent/README.md  

This file describes the project for developers, but its consequences affect you.  
It ensures that the chatbot is generated and updated in a consistent way.  

- It documents how developers should create data models from remote APIs.  
- This affects which structured tools and services can be safely exposed to you.  

---

# backend/src/neuroagent/agent_routine.py  

This module orchestrates the **core reasoning loop** of the chatbot.  
From your viewpoint, it determines how the assistant thinks, calls tools, and streams answers.  

- It decides when to answer directly and when to call specialized tools.  
- It manages **streaming**, so you see partial answers quickly.  
- It records information needed for usage tracking and for improving future versions.  

---

# backend/src/neuroagent/executor.py  

This component allows the system to run some tools inside a **sandboxed environment**.  
You indirectly benefit because it makes advanced tools safer to use.  

- It supports features that require code execution without compromising security.  
- It makes certain complex tools available that otherwise would not be allowed.  

---

# backend/src/neuroagent/mcp.json and backend/src/neuroagent/mcp.py  

These files define and manage **MCP servers**, which provide additional remote tools.  
They expand what the assistant can do for you without changing how you interact with it.  

- They can enable new tools without altering the chat interface.  
- They allow operators to plug in extra capabilities as the platform evolves.  

---

# backend/src/neuroagent/new_types.py  

This module defines high-level concepts like **Agent** and **Result**.  
As an end user, you see their effect in how the chatbot structures its responses.  

- They support agent handoffs, where a specialized agent takes over your query.  
- They standardize how content and tool results are presented back to you.  

---

# backend/src/neuroagent/utils.py  

This utility module provides many small helpers that improve your experience.  
They touch token counting, storage, partial responses, and message conversions.  

- They enable safe saving and deletion of files tied to your threads.  
- They help the chatbot reconstruct partial streaming responses into coherent messages.  
- They assist in accurate token accounting, which may influence quotas or costs.