---
title: "LangChainの概要と使い方｜サクッと始めるプロンプトエンジニアリング【LangChain / ChatGPT】"
source: "https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview"
author:
  - "[[Zenn]]"
published:
created: 2026-03-20
description:
tags:
  - "clippings"
---
このチャプターの目次

1. [LangChainとは？](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#langchain%E3%81%A8%E3%81%AF%EF%BC%9F)
2. [LangChainのできること](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#langchain%E3%81%AE%E3%81%A7%E3%81%8D%E3%82%8B%E3%81%93%E3%81%A8)
3. [LangChainの６つの機能](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#langchain%E3%81%AE%EF%BC%96%E3%81%A4%E3%81%AE%E6%A9%9F%E8%83%BD)
4. [LangChainの全体構成](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#langchain%E3%81%AE%E5%85%A8%E4%BD%93%E6%A7%8B%E6%88%90)
	1. [LangChainライブラリの構成](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#langchain%E3%83%A9%E3%82%A4%E3%83%96%E3%83%A9%E3%83%AA%E3%81%AE%E6%A7%8B%E6%88%90)
5. [LangChainの使い方【Python】](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#langchain%E3%81%AE%E4%BD%BF%E3%81%84%E6%96%B9%E3%80%90python%E3%80%91)
6. [LangChainの活用例](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#langchain%E3%81%AE%E6%B4%BB%E7%94%A8%E4%BE%8B)
	1. [1\. 業界専門のチャットボット](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#1.-%E6%A5%AD%E7%95%8C%E5%B0%82%E9%96%80%E3%81%AE%E3%83%81%E3%83%A3%E3%83%83%E3%83%88%E3%83%9C%E3%83%83%E3%83%88)
		2. [2\. 社内ネットワーク内のチャットボット](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#2.-%E7%A4%BE%E5%86%85%E3%83%8D%E3%83%83%E3%83%88%E3%83%AF%E3%83%BC%E3%82%AF%E5%86%85%E3%81%AE%E3%83%81%E3%83%A3%E3%83%83%E3%83%88%E3%83%9C%E3%83%83%E3%83%88)
		3. [3\. Agentsを用いた自立型エージェント](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#3.-agents%E3%82%92%E7%94%A8%E3%81%84%E3%81%9F%E8%87%AA%E7%AB%8B%E5%9E%8B%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88)
7. [【参考】Google Colaboratory](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#%E3%80%90%E5%8F%82%E8%80%83%E3%80%91google-colaboratory)
8. [参考文献](https://zenn.dev/umi_mori/books/prompt-engineer/viewer/langchain_overview#%E5%8F%82%E8%80%83%E6%96%87%E7%8C%AE)

この記事では「 **LangChainの概要と使い方** 」を紹介します！

この記事を読むことで、ChatGPTなどの生成系AIをより便利に活用することができるでしょう。

![](https://www.youtube.com/watch?v=H4jQBPdyBTc)

## LangChainとは？

LangChainとは「 **ChatGPTなどの大規模言語モデルの機能拡張を効率的に実装するためのライブラリ** 」です。

現時点（2024年3月13日時点）では、PythonとTypeScript（JavaScript）によるライブラリが公開されています。

基本的に、私のスタンスとしては、TypeScriptに比べて、Pythonの方がLangChainで利用できる機能が多いため、Pythonを用いて実装することをオススメします。

![](https://res.cloudinary.com/zenn/image/fetch/s--uP3Ax-cR--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_43.png?_a=BACAGSGT)

その他にも、非公式にはなりますが、Java向けの「LangChain4j」などのサードパーティライブラリも存在します。

## LangChainのできること

ChatGPTのような言語モデルは非常に汎用性が高いですが、ビジネス現場でそのまま使用するには4つの制限があります。

LangChainによって、これらの4つの制限を解消できます。

※ 注意：この文脈での「ChatGPT」とは、OpenAI社の公式のウェブアプリケーションを指します。

### 1\. モデル選択

- **ChatGPT**: OpenAI社のモデルしか使用できない。
- **LangChain**: OpenAI社のChatGPTに限らず、GoogleのGemini・Meta社のLlama・Anthropic社のClaudeなど、大規模言語モデルを使い分ける（切り替える）ことが容易になります。

### 2\. インフラ環境

- **ChatGPT**: ChatGPTの公式サービス上でしか、使用できない。
- **LangChain**: 社内の高いセキュリティ水準に対応したインフラ環境でアプリケーションを実行できる。

### 3\. 拡張性

- **ChatGPT**: 既存のサービスに組み込むことはできない。
- **LangChain**: ChatGPTのAPIとLangChainを組み合わせることで、容易に既存のサービスに拡張できる。

### 4\. カスタム機能

- **ChatGPT**: 公式サービスにはカスタム機能を追加するオプションは少ない（一部、ChatGPT Pluginで実現可能）。
- **LangChain**: ChatGPTの公式サービスにない任意のカスタム機能を追加できる。

![](https://res.cloudinary.com/zenn/image/fetch/s--_1CJdJv---/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_44.png?_a=BACAGSGT)

このように、LangChainを利用することで、これらの制限を大幅に解消でき、ビジネスでの運用においても大きな利点があります。

ここで一部の方は気付いたかもしれませんが、このような機能はLangChainを使わなくても実装できます。

しかし、LangChainの中でこのような機能が **パッケージ化** されているため、今まで書いていたような長いコードではなく、非常に短いコードで実装できます。

## LangChainの６つの機能

### 1\. Model I/O

Model I/Oとは「 **OpenAIをはじめとした様々な言語モデル・チャットモデル・エンべディングモデルを切り替えたり、組み合わせたりすることができる機能** 」です。

本来であれば、各ライブラリを理解し、それぞれの記法でコーディングする必要がありますが、LangChainではすでに複数のモデルが統合されているため、かなり手間が省けます。

また、タスクに応じたプロンプトテンプレートの管理や出力フォーマットの指定ができるため、かなり効率的にモデルを操作できます。

![](https://res.cloudinary.com/zenn/image/fetch/s--VsAHqr6g--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_45.png?_a=BACAGSGT)

詳細は、下記をご参照ください。

### 2\. Retrieval

Retrievalとは「 **言語モデルが学習していない事柄に関して、外部データを用いて、回答を生成するための機能** 」です。

たとえば、言語モデルが学習していない「最新情報」や「インターネットで公開されていない社内データ」に基づいて、回答を生成できます。

![](https://res.cloudinary.com/zenn/image/fetch/s--jaJoY2Cx--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_46.png?_a=BACAGSGT)

また、LangChainは外部データを読み込むための機能も用意しています。

現在、132個のデータ読み込みに対応しています。

馴染みがあるデータとしては「PDF、CSV、PowerPoint、Word、HTML、Markdown、Email、URL」などがあり、SaaSのサービスとしては「Notion、Figma、EverNote、Google Drive、Slack、YouTube」があります。

Retrivalを用いることで、幅広いデータ形式から、回答に必要な情報を取得し、そのデータから回答を生成できます。

![](https://res.cloudinary.com/zenn/image/fetch/s--39UNFCMp--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_47.png?_a=BACAGSGT)

詳細は、下記をご参照ください。

### 3\. Chains

Chainsは「 **複数のプロンプト入力を実行する機能** 」です。

この機能は、ChatGPTがたくさんの指示を一度に処理できない場合に特に役立ちます。

具体的には、複数のプロンプトに分けて、順番に実行することで、より精度の高い回答が得られます。

また、複雑な問題を解きたい時に、中間的な回答を一度出力することで、より正確な回答を得ることもできます。

このように中間的な推論ステップを踏むことで性能向上を図る手法を、「 **CoTプロンプティング** 」と呼びます。

![](https://res.cloudinary.com/zenn/image/fetch/s--nFNxjt4g--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_48.png?_a=BACAGSGT)

他にも、Chainsを用いることで、プロンプトの出力を組み合わせたりすることもできます。

たとえば、AとBの2つのプロンプトの出力を用いたプロンプトを実行することもできます。

より具体的な例を挙げてみましょう。

一度では処理できない長い文章を要約したい時があるとします。

その文章を5分割にして、それぞれの塊に対して要約のプロンプトを実行します。

その後、出力された5つの要約を入力として、要約のプロンプトを実行することで、長い文章をひとつの文章に要約できます。

![](https://res.cloudinary.com/zenn/image/fetch/s--p10OvBmZ--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_49.png?_a=BACAGSGT)

詳細は、下記をご参照ください。

### 4\. Memory

Memoryとは「 **ChainsやAgentsの内部における状態保持をする機能** 」です。

基本的に、LangChainで使用するOpenAI社のAPIなどは「 **ステートレス（状態を持たない）** 」です。

これは、各APIクエリーが独立して処理され、そのクエリーが終わると、状態や文脈がリセットされるという意味です。

簡単に言うと、一回の質問と回答が終わった後、次の質問は前の質問と回答について何も知らない状態になります。

そこで、Memoryを使うことで、過去の会話も記憶した自然な回答を生成できます。

![](https://res.cloudinary.com/zenn/image/fetch/s--osvrTURD--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_50.png?_a=BACAGSGT)

詳細は、下記をご参照ください。

### 5\. Agents

Agentsとは「 **言語モデルに渡されたツールを用いて、モデル自体が、次にどのようなアクションを取るかを決定・実行・観測・完了するまで繰り返す機能** 」です。

まず、「 **言語モデルに渡されるツール** 」とは、言語モデルがタスク達成のために使用することができるリソースや機能を指します。

たとえば、数式演算、検索エンジンの利用、特定のデータベースへのアクセス、特定のAPIの呼び出しといった機能などが含まれます。

Agentsは、与えられた目標を達成するために、渡されたツールを用いて、自立的に考え、行動する機能です。

この機能によって、モデルは複雑なタスクを自動的に処理することができるようになります。

![](https://res.cloudinary.com/zenn/image/fetch/s--PXYu2-fU--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_51.png?_a=BACAGSGT)

イメージを伝えるために、一例を紹介します。

たとえば「Google検索をするツール」と「Pythonのコードを実行するツール」を入力として、次のようにプロンプトを実行したとします。

```
私はPythonのエンジニアです。

2000年から2023年までの日付を入力したら、その時の総理大臣の名前を出力する関数のPythonコードを作ってください。

そして、その関数の単体テストのデータとコードを作ってください。

最後に、そのテストコードをPythonで実行して、結果が正しいか検証してください。

もしも正しい結果が得られれば、その関数のスクリプトを出力してください。

もしも誤っている場合は、そのスクリプトの誤りを修正することを繰り返してください。
```

その結果、Agentは言語モデルが必要な情報を「Google検索ツール」で収集し、Pythonの関数を生成した後に「Pythonのコードを実行するツール」を用いて検証を行ってくれるイメージです。

詳細は、下記をご参照ください。

### 6\. Callbacks

Callbacksとは「 **大規模言語モデルのアプリケーションのロギング、モニタリング、非同期処理などを効率的に管理する機能** 」です。

![](https://res.cloudinary.com/zenn/image/fetch/s--7Gs--wjj--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_52.png?_a=BACAGSGT)

ここでは、代表的な2つの機能を紹介します。

1. **コールバックシステム**: アプリケーションのログの記録やアプリケーションのモニタリングに特に有用です。

これにより、何か問題が発生した場合やパフォーマンスが低下した場合に、すぐにその原因を特定し、対処できます。

1. **非同期処理のサポート**: Callbacks機能は非同期処理に対応しており、これにより処理の効率が向上します。ストリーミングや他の非同期タスクもスムーズに行えます。

たとえば、大量のデータをリアルタイムで処理するようなストリーミングタスクでも、アプリケーションは安定して動作するように設計できます。

![](https://res.cloudinary.com/zenn/image/fetch/s--uyvF6PrJ--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_53.png?_a=BACAGSGT)

この機能により、開発者がアプリケーションの動作をより細かく制御し、管理できます。

詳細は、下記をご参照ください。

## LangChainの全体構成

最近、LangChainの構成はアップデートされて、以下のような構成になりました。

- **LangChainライブラリ**: PythonおよびJavaScript（TypeScript）のライブラリ。ChainsやAgents, Retrievalなどのプログラムから実行する機能が含まれます。
- **LangChain Templates**: 一般的なチャットツールなどで使われる機能のテンプレートが用意されています。また、LangServeと組み合わせることによって、デプロイも簡略化できます。参照アプリケーションとも言います。
- **LangServe**: LangChainにおけるRunnablesとChainsをREST APIとしてデプロイするためのライブラリです。
- **LangSmith**: LLMフレームワークに構築された機能をデバッグ、テスト、評価、モニタリングできる開発者プラットフォームです。LLMOps / AIOps / DevOpsの位置付けに当たります。

![](https://res.cloudinary.com/zenn/image/fetch/s--ES8A8khV--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_55_langchain_overview.png?_a=BACAGSGT)  
*[LangChain Introduction](https://python.langchain.com/docs/get_started/introduction) より引用*

### LangChainライブラリの構成

さらに、LangChainライブラリは大きく分けて以下の3つから構成されます。

1. `langchain-core`: LCELという表記に関するパッケージ（LCELについては後ほどの章で解説）
2. `langchain-community`: サードパーティを統合したパッケージ
3. `langchain`: チェーン、エージェント、および検索戦略といった機能を含めたパッケージ

これら3つのパッケージは `pip install langchain` でまとめてインストールすることが可能です。

## LangChainの使い方【Python】

次に、Pythonによるプログラミング方法を解説します。  
具体的には、次の3つのことを実行したいと思います。

1. OpenAIモデルの呼び出し（LangChain Model I/O | Chat models）
2. プロンプトテンプレートの作成（LangChain Model I/O | Prompt templates）
3. LLM Chainの実行（LangChain Chains）

### 環境構築

まず、環境構築として、LangChainとOpenAIのライブラリを用いるため、以下のコマンドを実行しましょう。

```
!pip install openai==1.13.3
!pip install langchain==0.1.11
!pip install langchain-openai==0.0.8
```

次に、APIキーを設定します。「...」の部分は、ご自身のAPIキーを入れてください。

```
import os

os.environ["OPENAI_API_KEY"] = "..."
```

### 実装方法

下記の例では、「文章に誤字がないかという校正をする」プロンプトを実行していきます。

```
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

# OpenAIのモデルのインスタンスを作成
llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)

# プロンプトのテンプレート文章を定義
template = """
次の文章に誤字がないか調べて。誤字があれば訂正してください。
{sentences_before_check}
"""

# テンプレート文章にあるチェック対象の単語を変数化
prompt = ChatPromptTemplate.from_messages([
    ("system", "あなたは優秀な校正者です。"),
    ("user", template)
])

# チャットメッセージを文字列に変換するための出力解析インスタンスを作成
output_parser = StrOutputParser()

# OpenAIのAPIにこのプロンプトを送信するためのチェーンを作成
chain = prompt | llm | output_parser

# チェーンを実行し、結果を表示
print(chain.invoke({"sentences_before_check": "こんんんちわ、真純です。"}))
```

これに対する実行結果は次の通りです。

```
次の文章には誤字があります。正しい表記は以下の通りです。

こんにちは、真純です。
```

## LangChainの活用例

最後に、LangChainの機能を活用したアプリケーションの活用例を3つご紹介します。

### 1\. 業界専門のチャットボット

LangChainを利用すれば、特定の業界や領域に特化したチャットボットを開発できます。

医療、金融、カスタマーサポートなど、特定の領域に最適化できます。

これにより、業界固有の質問やタスクに対応できるようになります。

### 2\. 社内ネットワーク内のチャットボット

LangChainを用いることで、社内のネットワークに閉じた、セキュリティ水準の高いチャットボットを作ることができます。

OpenAIのサーバーにデータを送信したら、HTTPのネットワーク上にもデータを通信させたくない場合は、Azure OpenAI Serviceを利用することをオススメします。

### 3\. Agentsを用いた自立型エージェント

LangChainのAgentsを使用するれば、用意されたツールを使用して自動でタスクを完了する自律型エージェントを構築できます。

これにより、「スケジュール管理、上司や部下への進捗報告、議事録の作成と共有」など、業務の自動化が可能です。

このように、LangChainを用いることで、様々なビジネスニーズに合わせて、開発を効率化できます。

そのため、あなたが日々行なっている業務フローの中で、自動化・効率化できそうな業務を探して、実際にLangChainを用いて実装してみてください！

![](https://res.cloudinary.com/zenn/image/fetch/s--_8HIn00R--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_1200/https://storage.googleapis.com/zenn-contents/prompt_engineer_05_langchain_overview_54.png?_a=BACAGSGT)

## 【参考】Google Colaboratory

## 参考文献

宣伝：もしもよかったらご覧ください^^

**『 [AIとコミュニケーションする技術（インプレス出版）](https://amzn.to/3ME8mLF) 』という書籍を出版しました🎉**

これからの未来において「変わらない知識」を見極めて、生成AIの業界において、読まれ続ける「バイブル」となる本をまとめ上げました。

かなり自信のある一冊なため、もしもよろしければ、ご一読いただけますと幸いです^^