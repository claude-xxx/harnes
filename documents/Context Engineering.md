---
title: "Context Engineering"
source: "https://blog.langchain.com/context-engineering-for-agents/"
author:
  - "[[LangChain Accounts]]"
published: 2025-07-03
created: 2026-03-20
description: "TL;DRAgents need context to perform tasks. Context engineering is the art and science of filling the context window with just the right information at each step of an agent’s trajectory. In this post, we break down some common strategies — write, select, compress, and isolate — for context engineering"
tags:
  - "clippings"
---
### 要約

エージェントはタスクを実行するためにコンテキストを必要とします。コンテキストエンジニアリングとは、エージェントの軌跡の各ステップにおいて、コンテキストウィンドウに適切な情報だけを詰め込む技術と科学です。この記事では、さまざまな人気エージェントや論文をレビューすることで、コンテキストエンジニアリングにおける一般的な戦略（ **書き込み、選択、圧縮、分離）** を詳しく解説します。そして、LangGraphがこれらの戦略をどのようにサポートするように設計されているかを説明します。

**また、コンテキストエンジニアリングに関する動画は** [**こちらを**](https://youtu.be/4GiqzUHD5AA?ref=blog.langchain.com) **ご覧ください。**

![](https://blog.langchain.com/content/images/2025/07/image.png)

コンテキストエンジニアリングの一般的なカテゴリ

### コンテキストエンジニアリング

Andrej Karpathy氏が述べているように、LLMは [新しいタイプのオペレーティングシステムの](https://www.youtube.com/watch?si=-aKY-x57ILAmWTdw&t=620&v=LCEmiRjPEtQ&feature=youtu.be&ref=blog.langchain.com) ようなものです。LLMはCPUに相当し、その [コンテキストウィンドウ](https://docs.anthropic.com/en/docs/build-with-claude/context-windows?ref=blog.langchain.com) はRAMに相当し、モデルのワーキングメモリとして機能します。RAMと同様に、LLMのコンテキストウィンドウは、さまざまなコンテキストソースを処理する [容量](https://lilianweng.github.io/posts/2023-06-23-agent/?ref=blog.langchain.com) が限られています。そして、オペレーティングシステムがCPUのRAMに収まるものを選別するように、「コンテキストエンジニアリング」も同様の役割を果たすと考えることができます。Karpathy [氏はこれをうまくまとめています](https://x.com/karpathy/status/1937902205765607626?ref=blog.langchain.com) 。

> *\[コンテキストエンジニアリングとは\]「…次のステップに必要な情報をコンテキストウィンドウに正確に入力する、繊細な技術と科学である。」*

![](https://blog.langchain.com/content/images/2025/07/image-1.png)

LLMアプリケーションで一般的に使用されるコンテキストタイプ

LLMアプリケーションを構築する際に管理する必要のあるコンテキストの種類とは何でしょうか？コンテキストエンジニアリングは、 いくつかの異なるコンテキストタイプに適用される [包括的な概念です。](https://x.com/dexhorthy/status/1933283008863482067?ref=blog.langchain.com)

- **手順** – プロンプト、記憶、数ショットの例、ツールの説明など
- **知識** ― 事実、記憶など
- **ツール** – ツール呼び出しからのフィードバック

### エージェントのためのコンテキストエンジニアリング

今年は、 LLMの [推論](https://platform.openai.com/docs/guides/reasoning?api-mode=responses&ref=blog.langchain.com) 能力と [ツール呼び出し能力](https://www.anthropic.com/engineering/building-effective-agents?ref=blog.langchain.com) の向上に伴い、 [エージェント](https://www.anthropic.com/engineering/building-effective-agents?ref=blog.langchain.com) への関心が飛躍的に高まっています。 [エージェントは](https://www.anthropic.com/engineering/building-effective-agents?ref=blog.langchain.com) 、多くの場合、 [長時間実行されるタスクにおいて、](https://blog.langchain.com/introducing-ambient-agents/) [LLMの呼び出しとツールの呼び出しを](https://www.anthropic.com/engineering/building-effective-agents?ref=blog.langchain.com) 交互に実行します 。エージェントは、ツールのフィードバックを利用して次のステップを決定する際に、 [LLMの呼び出しとツールの呼び出しを](https://www.anthropic.com/engineering/building-effective-agents?ref=blog.langchain.com) 交互に実行します。

![](https://blog.langchain.com/content/images/2025/07/image-2.png)

エージェントは LLM呼び出しと ツール呼び出しを 交互に行い、ツールのフィードバックを使用して次のステップを決定します。

しかし、長時間実行されるタスクやツール呼び出しからのフィードバックが蓄積されることにより、エージェントはしばしば大量のトークンを使用します。これは、 [コンテキストウィンドウのサイズを超えたり](https://cognition.ai/blog/kevin-32b?ref=blog.langchain.com) 、コストやレイテンシが膨れ上がったり、エージェントのパフォーマンスが低下したりするなど、多くの問題を引き起こす可能性があります。Drew Breunig氏は、 コンテキストが長くなるとパフォーマンスの問題を引き起こす具体的な方法をいくつか [分かりやすく説明しています。](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html?ref=blog.langchain.com)

- [文脈中毒：幻覚が文脈に入り込むこと](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html?ref=blog.langchain.com#context-poisoning)
- [文脈による注意散漫：文脈がトレーニングを圧倒してしまう場合](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html?ref=blog.langchain.com#context-distraction)
- [Context Confusion: When superfluous context influences the response](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html?ref=blog.langchain.com#context-confusion)
- [Context Clash: When parts of the context disagree](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html?ref=blog.langchain.com#context-clash)
![](https://blog.langchain.com/content/images/2025/07/image-3.png)

Context from tool calls accumulates over multiple agent turns

With this in mind, [Cognition](https://cognition.ai/blog/dont-build-multi-agents?ref=blog.langchain.com) called out the importance of context engineering:

> *“Context engineering” … is effectively the #1 job of engineers building AI agents.*

[Anthropic](https://www.anthropic.com/engineering/built-multi-agent-research-system?ref=blog.langchain.com) also laid it out clearly:

> *Agents often engage in conversations spanning hundreds of turns, requiring careful context management strategies.*

So, how are people tackling this challenge today? We group common strategies for agent context engineering into four buckets — **write, select, compress, and isolate —** and give examples of each from review of some popular agent products and papers. We then explain how LangGraph is designed to support them!

![](https://blog.langchain.com/content/images/2025/07/image-4.png)

General categories of context engineering

### Write Context

*Writing context means saving it outside the context window to help an agent perform a task.*

**Scratchpads**

When humans solve tasks, we take notes and remember things for future, related tasks. Agents are also gaining these capabilities! Note-taking via a “ [scratchpad](https://www.anthropic.com/engineering/claude-think-tool?ref=blog.langchain.com) ” is one approach to persist information while an agent is performing a task. The idea is to save information outside of the context window so that it’s available to the agent. [Anthropic’s multi-agent researcher](https://www.anthropic.com/engineering/built-multi-agent-research-system?ref=blog.langchain.com) illustrates a clear example of this:

> *The LeadResearcher begins by thinking through the approach and saving its plan to Memory to persist the context, since if the context window exceeds 200,000 tokens it will be truncated and it is important to retain the plan.*

Scratchpads can be implemented in a few different ways. They can be a [tool call](https://www.anthropic.com/engineering/claude-think-tool?ref=blog.langchain.com) that simply [writes to a file](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem?ref=blog.langchain.com). They can also be a field in a runtime [state object](https://langchain-ai.github.io/langgraph/concepts/low_level/?ref=blog.langchain.com#state) that persists during the session. In either case, scratchpads let agents save useful information to help them accomplish a task.

**Memories**

Scratchpads help agents solve a task within a given session (or [thread](https://langchain-ai.github.io/langgraph/concepts/persistence/?ref=blog.langchain.com#threads)), but sometimes agents benefit from remembering things across *many* sessions! [Reflexion](https://arxiv.org/abs/2303.11366?ref=blog.langchain.com) introduced the idea of reflection following each agent turn and re-using these self-generated memories. [Generative Agents](https://ar5iv.labs.arxiv.org/html/2304.03442?ref=blog.langchain.com) created memories synthesized periodically from collections of past agent feedback.

![](https://blog.langchain.com/content/images/2025/07/image-5.png)

An LLM can be used to update or create memories

These concepts made their way into popular products like [ChatGPT](https://help.openai.com/en/articles/8590148-memory-faq?ref=blog.langchain.com), [Cursor](https://forum.cursor.com/t/0-51-memories-feature/98509?ref=blog.langchain.com), and [Windsurf](https://docs.windsurf.com/windsurf/cascade/memories?ref=blog.langchain.com), which all have mechanisms to auto-generate long-term memories that can persist across sessions based on user-agent interactions.

### Select Context

*Selecting context means pulling it into the context window to help an agent perform a task.*

**Scratchpad**

The mechanism for selecting context from a scratchpad depends upon how the scratchpad is implemented. If it’s a [tool](https://www.anthropic.com/engineering/claude-think-tool?ref=blog.langchain.com), then an agent can simply read it by making a tool call. If it’s part of the agent’s runtime state, then the developer can choose what parts of state to expose to an agent each step. This provides a fine-grained level of control for exposing scratchpad context to the LLM at later turns.

**Memories**

If agents have the ability to save memories, they also need the ability to select memories relevant to the task they are performing. This can be useful for a few reasons. Agents might select few-shot examples ([episodic](https://langchain-ai.github.io/langgraph/concepts/memory/?ref=blog.langchain.com#memory-types) [memories](https://arxiv.org/pdf/2309.02427?ref=blog.langchain.com)) for examples of desired behavior, instructions ([procedural](https://langchain-ai.github.io/langgraph/concepts/memory/?ref=blog.langchain.com#memory-types) [memories](https://arxiv.org/pdf/2309.02427?ref=blog.langchain.com)) to steer behavior, or facts ([semantic](https://langchain-ai.github.io/langgraph/concepts/memory/?ref=blog.langchain.com#memory-types) [memories](https://arxiv.org/pdf/2309.02427?ref=blog.langchain.com)) for task-relevant context.

![](https://blog.langchain.com/content/images/2025/07/image-6.png)

A few places where summarization can be applied

One challenge is ensuring that relevant memories are selected. Some popular agents simply use a narrow set of files that are *always* pulled into context. For example, many code agent use specific files to save instructions (”procedural” memories) or, in some cases, examples (”episodic” memories). Claude Code uses [`CLAUDE.md`](http://claude.md/?ref=blog.langchain.com). [Cursor](https://docs.cursor.com/context/rules?ref=blog.langchain.com) and [Windsurf](https://windsurf.com/editor/directory?ref=blog.langchain.com) use rules files.

But, if an agent is storing a larger [collection](https://langchain-ai.github.io/langgraph/concepts/memory/?ref=blog.langchain.com#collection) of facts and / or relationships (e.g., [semantic](https://langchain-ai.github.io/langgraph/concepts/memory/?ref=blog.langchain.com#memory-types) memories), selection is harder. [ChatGPT](https://help.openai.com/en/articles/8590148-memory-faq?ref=blog.langchain.com) is a good example of a popular product that stores and selects from a large collection of user-specific memories.

Embeddings and / or [knowledge](https://arxiv.org/html/2501.13956v1?ref=blog.langchain.com#:~:text=In%20Zep%2C%20memory%20is%20powered,subgraph%2C%20and%20a%20community%20subgraph) [graphs](https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/?ref=blog.langchain.com#:~:text=changes%20since%20updates%20can%20trigger,and%20holistic%20memory%20for%20agentic) for memory indexing are commonly used to assist with selection. Still, memory selection is challenging. At the AIEngineer World’s Fair, [Simon Willison shared](https://simonwillison.net/2025/Jun/6/six-months-in-llms/?ref=blog.langchain.com) an example of selection gone wrong: ChatGPT fetched his location from memories and unexpectedly injected it into a requested image. This type of unexpected or undesired memory retrieval can make some users feel like the context window “ *no longer belongs to them* ”!

**Tools**

Agents use tools, but can become overloaded if they are provided with too many. This is often because the tool descriptions overlap, causing model confusion about which tool to use. One approach is [to apply RAG (retrieval augmented generation) to tool descriptions](https://arxiv.org/abs/2410.14594?ref=blog.langchain.com) in order to fetch only the most relevant tools for a task. Some [recent papers](https://arxiv.org/abs/2505.03275?ref=blog.langchain.com) have shown that this improve tool selection accuracy by 3-fold.

**Knowledge**

[RAG](https://github.com/langchain-ai/rag-from-scratch?ref=blog.langchain.com) is a rich topic and it [can be a central context engineering challenge](https://x.com/_mohansolo/status/1899630246862966837?ref=blog.langchain.com). Code agents are some of the best examples of RAG in large-scale production. Varun from Windsurf captures some of these challenges well:

> *Indexing code ≠ context retrieval … \[We are doing indexing & embedding search … \[with\] AST parsing code and chunking along semantically meaningful boundaries … embedding search becomes unreliable as a retrieval heuristic as the size of the codebase grows … we must rely on a combination of techniques like grep/file search, knowledge graph based retrieval, and … a re-ranking step where \[context\] is ranked in order of relevance.*

### Compressing Context

*Compressing context involves retaining only the tokens required to perform a task.*

**Context Summarization**

Agent interactions can span [hundreds of turns](https://www.anthropic.com/engineering/built-multi-agent-research-system?ref=blog.langchain.com) and use token-heavy tool calls. Summarization is one common way to manage these challenges. If you’ve used Claude Code, you’ve seen this in action. Claude Code runs “ [auto-compact](https://docs.anthropic.com/en/docs/claude-code/costs?ref=blog.langchain.com) ” after you exceed 95% of the context window and it will summarize the full trajectory of user-agent interactions. This type of compression across an [agent trajectory](https://langchain-ai.github.io/langgraph/concepts/memory/?ref=blog.langchain.com#manage-short-term-memory) can use various strategies such as [recursive](https://arxiv.org/pdf/2308.15022?ref=blog.langchain.com#:~:text=the%20retrieved%20utterances%20capture%20the,based%203) or [hierarchical](https://alignment.anthropic.com/2025/summarization-for-monitoring/?ref=blog.langchain.com#:~:text=We%20addressed%20these%20issues%20by,of%20our%20computer%20use%20capability) summarization.

![](https://blog.langchain.com/content/images/2025/07/image-7.png)

A few places where summarization can be applied

It can also be useful to [add summarization](https://github.com/langchain-ai/open_deep_research/blob/e5a5160a398a3699857d00d8569cb7fd0ac48a4f/src/open_deep_research/utils.py?ref=blog.langchain.com#L1407) at specific points in an agent’s design. For example, it can be used to post-process certain tool calls (e.g., token-heavy search tools). As a second example, [Cognition](https://cognition.ai/blog/dont-build-multi-agents?ref=blog.langchain.com#a-theory-of-building-long-running-agents) mentioned summarization at agent-agent boundaries to reduce tokens during knowledge hand-off. Summarization can be a challenge if specific events or decisions need to be captured. [Cognition](https://cognition.ai/blog/dont-build-multi-agents?ref=blog.langchain.com#a-theory-of-building-long-running-agents) uses a fine-tuned model for this, which underscores how much work can go into this step.

**Context Trimming**

Whereas summarization typically uses an LLM to distill the most relevant pieces of context, trimming can often filter or, as Drew Breunig points out, “ [prune](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html?ref=blog.langchain.com) ” context. This can use hard-coded heuristics like removing [older messages](https://python.langchain.com/docs/how_to/trim_messages/?ref=blog.langchain.com) from a list. Drew also mentions [Provence](https://arxiv.org/abs/2501.16214?ref=blog.langchain.com), a trained context pruner for Question-Answering.

### Isolating Context

*Isolating context involves splitting it up to help an agent perform a task.*

**Multi-agent**

One of the most popular ways to isolate context is to split it across sub-agents. A motivation for the OpenAI [Swarm](https://github.com/openai/swarm?ref=blog.langchain.com) library was [separation of concerns](https://openai.github.io/openai-agents-python/ref/agent/?ref=blog.langchain.com), where a team of agents can handle specific sub-tasks. Each agent has a specific set of tools, instructions, and its own context window.

![](https://blog.langchain.com/content/images/2025/07/image-8.png)

Split context across multiple agents

Anthropic’s [multi-agent researcher](https://www.anthropic.com/engineering/built-multi-agent-research-system?ref=blog.langchain.com) makes a case for this: many agents with isolated contexts outperformed single-agent, largely because each subagent context window can be allocated to a more narrow sub-task. As the blog said:

> *\[Subagents operate\] in parallel with their own context windows, exploring different aspects of the question simultaneously.*

Of course, the challenges with multi-agent include token use (e.g., up to [15× more tokens](https://www.anthropic.com/engineering/built-multi-agent-research-system?ref=blog.langchain.com) than chat as reported by Anthropic), the need for careful [prompt engineering](https://www.anthropic.com/engineering/built-multi-agent-research-system?ref=blog.langchain.com) to plan sub-agent work, and coordination of sub-agents.

**Context Isolation with Environments**

HuggingFace’s [deep researcher](https://huggingface.co/blog/open-deep-research?ref=blog.langchain.com#:~:text=From%20building%20,it%20can%20still%20use%20it) shows another interesting example of context isolation. Most agents use [tool calling APIs](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview?ref=blog.langchain.com), which return JSON objects (tool arguments) that can be passed to tools (e.g., a search API) to get tool feedback (e.g., search results). HuggingFace uses a [CodeAgent](https://huggingface.co/papers/2402.01030?ref=blog.langchain.com), which outputs that contains the desired tool calls. The code then runs in a [sandbox](https://e2b.dev/?ref=blog.langchain.com). Selected context (e.g., return values) from the tool calls is then passed back to the LLM.

![](https://blog.langchain.com/content/images/2025/07/image-9.png)

Sandboxes can isolate context from the LLM.

This allows context to be isolated from the LLM in the environment. Hugging Face noted that this is a great way to isolate token-heavy objects in particular:

> *\[Code Agents allow for\] a better handling of state … Need to store this image / audio / other for later use? No problem, just assign it as a variable* [*in your state and you \[use it later\]*](https://deepwiki.com/search/i-am-wondering-if-state-that-i_0e153539-282a-437c-b2b0-d2d68e51b873?ref=blog.langchain.com)*.*

**State**

It’s worth calling out that an agent’s runtime [state object](https://langchain-ai.github.io/langgraph/concepts/low_level/?ref=blog.langchain.com#state) can also be a great way to isolate context. This can serve the same purpose as sandboxing. A state object can be designed with a [schema](https://langchain-ai.github.io/langgraph/concepts/low_level/?ref=blog.langchain.com#schema) that has fields that context can be written to. One field of the schema (e.g., `messages`) can be exposed to the LLM at each turn of the agent, but the schema can isolate information in other fields for more selective use.

### Context Engineering with LangSmith / LangGraph

So, how can you apply these ideas? Before you start, there are two foundational pieces that are helpful. First, ensure that you have a way to [look at your data](https://hamel.dev/blog/posts/evals/?ref=blog.langchain.com) and track token-usage across your agent. This helps inform where best to apply effort context engineering. [LangSmith](https://docs.smith.langchain.com/?ref=blog.langchain.com) is well-suited for agent [tracing / observability](https://docs.smith.langchain.com/observability?ref=blog.langchain.com), and offers a great way to do this. Second, be sure you have a simple way to test whether context engineering hurts or improve agent performance. LangSmith enables [agent evaluation](https://docs.smith.langchain.com/evaluation/tutorials/agents?ref=blog.langchain.com) to test the impact of any context engineering effort.

**Write context**

LangGraph was designed with both thread-scoped ([short-term](https://langchain-ai.github.io/langgraph/concepts/memory/?ref=blog.langchain.com#short-term-memory)) and [long-term memory](https://langchain-ai.github.io/langgraph/concepts/memory/?ref=blog.langchain.com#long-term-memory). Short-term memory uses [checkpointing](https://langchain-ai.github.io/langgraph/concepts/persistence/?ref=blog.langchain.com) to persist [agent state](https://langchain-ai.github.io/langgraph/concepts/low_level/?ref=blog.langchain.com#state) across all steps of an agent. This is extremely useful as a “scratchpad”, allowing you to write information to state and fetch it at any step in your agent trajectory.

LangGraph’s long-term memory lets you to persist context *across many sessions* with your agent. It is flexible, allowing you to save small sets of [files](https://langchain-ai.github.io/langgraph/concepts/memory/?ref=blog.langchain.com#profile) (e.g., a user profile or rules) or larger [collections](https://langchain-ai.github.io/langgraph/concepts/memory/?ref=blog.langchain.com#collection) of memories. In addition, [LangMem](https://langchain-ai.github.io/langmem/?ref=blog.langchain.com) provides a broad set of useful abstractions to aid with LangGraph memory management.

**Select context**

Within each node (step) of a LangGraph agent, you can fetch [state](https://langchain-ai.github.io/langgraph/concepts/low_level/?ref=blog.langchain.com#state). This give you fine-grained control over what context you present to the LLM at each agent step.

In addition, LangGraph’s long-term memory is accessible within each node and supports various types of retrieval (e.g., fetching files as well as [embedding-based retrieval on a memory collection).](https://langchain-ai.github.io/langgraph/cloud/reference/cli/?ref=blog.langchain.com#adding-semantic-search-to-the-store) For an overview of long-term memory, see [our Deeplearning.ai course](https://www.deeplearning.ai/short-courses/long-term-agentic-memory-with-langgraph/?ref=blog.langchain.com). And for an entry point to memory applied to a specific agent, see our [Ambient Agents](https://academy.langchain.com/courses/ambient-agents?ref=blog.langchain.com) course. This shows how to use LangGraph memory in a long-running agent that can manage your email and learn from your feedback.

![](https://blog.langchain.com/content/images/2025/07/image-10.png)

Email agent with user feedback and long-term memory

For tool selection, the [LangGraph Bigtool](https://github.com/langchain-ai/langgraph-bigtool?ref=blog.langchain.com) library is a great way to apply semantic search over tool descriptions. This helps select the most relevant tools for a task when working with a large collection of tools. Finally, we have several [tutorials and videos](https://langchain-ai.github.io/langgraph/tutorials/rag/langgraph_agentic_rag/?ref=blog.langchain.com) that show how to use various types of RAG with LangGraph.

**Compressing context**

Because LangGraph [is a low-level orchestration framework](https://blog.langchain.com/how-to-think-about-agent-frameworks/), you [lay out your agent as a set of nodes](https://www.youtube.com/watch?v=aHCDrAbH_go&ref=blog.langchain.com), [define](https://blog.langchain.com/how-to-think-about-agent-frameworks/) the logic within each one, and define an state object that is passed between them. This control offers several ways to compress context.

One common approach is to use a message list as your agent state and [summarize or trim](https://langchain-ai.github.io/langgraph/how-tos/memory/add-memory/?ref=blog.langchain.com#manage-short-term-memory) it periodically using [a few built-in utilities](https://langchain-ai.github.io/langgraph/how-tos/memory/add-memory/?ref=blog.langchain.com#manage-short-term-memory). However, you can also add logic to post-process [tool calls](https://github.com/langchain-ai/open_deep_research/blob/e5a5160a398a3699857d00d8569cb7fd0ac48a4f/src/open_deep_research/utils.py?ref=blog.langchain.com#L1407) or work phases of your agent in a few different ways. You can add summarization nodes at specific points or also add summarization logic to your tool calling node in order to compress the output of specific tool calls.

**Isolating context**

LangGraphは [状態](https://langchain-ai.github.io/langgraph/concepts/low_level/?ref=blog.langchain.com#state) オブジェクトを中心に設計されており、状態スキーマを指定して各エージェントステップで状態にアクセスできます。たとえば、ツール呼び出しからのコンテキストを状態の特定のフィールドに保存し、そのコンテキストが必要になるまでLLMから分離することができます。状態に加えて、LangGraphはコンテキスト分離のためのサンドボックスの使用もサポートしています。 ツール呼び出しに [E2Bサンドボックス](https://e2b.dev/?ref=blog.langchain.com) を使用するLangGraphエージェントの例については、この [リポジトリを参照してください。状態を永続化できるPyodideを使用したサンドボックスの例については、この](https://github.com/jacoblee93/mini-chat-langchain?tab=readme-ov-file&ref=blog.langchain.com) [ビデオを参照してください。LangGraphは、](https://www.youtube.com/watch?v=FBnER2sxt0w&ref=blog.langchain.com) [supervisorライブラリ](https://github.com/langchain-ai/langgraph-supervisor-py?ref=blog.langchain.com) や [swarm](https://github.com/langchain-ai/langgraph-swarm-py?ref=blog.langchain.com) ライブラリなど、マルチエージェントアーキテクチャの構築を強力にサポートしています。LangGraph でマルチエージェントを使用する方法の詳細については、 [これらの](https://www.youtube.com/watch?v=JeyDrn1dSUQ&ref=blog.langchain.com) [ビデオを](https://www.youtube.com/watch?v=B_0TNuYi56w&ref=blog.langchain.com) [参照して](https://www.youtube.com/watch?v=4nZl32FwU-o&ref=blog.langchain.com) ください。

### 結論

コンテキストエンジニアリングは、エージェント開発者が習得を目指すべき技術になりつつあります。ここでは、現在多くの人気エージェントに見られるいくつかの共通パターンについて解説します。

- *コンテキストを書き込む - エージェントがタスクを実行する際に役立つように、コンテキストウィンドウの外にコンテキストを保存する。*
- *コンテキストの選択 - エージェントがタスクを実行するのを支援するために、コンテキストウィンドウにコンテキストを取り込む。*
- *コンテキストの圧縮 - タスクを実行するために必要なトークンのみを保持する。*
- *コンテキストの分離 - エージェントがタスクを実行するのに役立つようにコンテキストを分割する。*

LangGraphを使えば、これらの機能を簡単に実装できます。また、LangSmithを使えば、エージェントのテストやコンテキストの使用状況の追跡も簡単に行えます。LangGraphとLangSmithを組み合わせることで、コンテキストエンジニアリングを適用する最適な機会を特定し、実装し、テストし、そしてそれを繰り返すという、好循環を生み出すフィードバックループが実現します。