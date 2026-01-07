# NeuroAgent Capabilities Documentation

## Overview

NeuroAgent is an AI-powered chatbot designed specifically for neuroscience research and brain data exploration. It provides intelligent assistance for researchers working with the Open Brain Platform, offering access to vast neuroscience datasets, computational tools, and research capabilities.

## Core Capabilities

### 1. Brain Data Exploration and Analysis

#### Neuron Morphology Analysis
- **Search and retrieve cell morphologies** from different brain regions (cerebellum, cortex, hippocampus, etc.)
- **Analyze morphological properties** including dendrites, axons, and soma characteristics
- **Filter morphologies** by brain region, species (mouse, rat, human), and morphological types
- **Visualize morphology data** and compute morphometric statistics
- **Access detailed morphology metadata** including measurements and classifications

#### Circuit Analysis and Connectivity
- **Analyze neural circuit connectivity patterns** including excitatory and inhibitory connections
- **Examine circuit populations** and their spatial distributions
- **Query circuit metrics** such as connection probabilities and synapse counts
- **Investigate circuit composition** by cell types, layers, and brain regions
- **Analyze connectivity between specific neuron populations** with detailed filtering options

#### Electrophysiology and Ion Channels
- **Search ion channel data** by gene names and properties
- **Access electrophysiological recordings** from neurons
- **Analyze electrical properties** of different cell types
- **Explore ion channel models** and their characteristics
- **Examine electrical cell recordings** and their metadata

### 2. Research and Literature Support

#### Academic Literature Search
- **Search 100M+ research papers** with full-text access using advanced AI search
- **Filter papers by publication date** and research domains
- **Access paper abstracts and excerpts** with detailed metadata
- **Find recent research** on specific neuroscience topics
- **Discover relevant publications** for brain regions and research areas

#### Paper Reading and Analysis
- **Extract full content** from research paper URLs
- **Read and summarize** academic articles
- **Access publicly available papers** from major publishers
- **Analyze paper content** and extract key findings
- **Cross-reference multiple papers** on related topics

#### Web Search Integration
- **Search the web** for neuroscience-related information
- **Access real-time information** about research tools and software
- **Find documentation** for neuroscience software packages
- **Discover research resources** and databases

### 3. Data Analysis and Visualization

#### Python Code Execution
- **Run Python code** in a secure sandbox environment
- **Create interactive visualizations** using Plotly
- **Perform statistical analysis** with NumPy, Pandas, and SciPy
- **Execute machine learning tasks** using Scikit-learn
- **Generate plots and charts** that display directly in the chat

#### Circuit Population Analysis
- **Query circuit populations** using natural language
- **Analyze neuron distributions** by cell type, layer, and region
- **Generate statistical summaries** of circuit properties
- **Filter neurons** by spatial and biological properties
- **Examine circuit composition** and cellular characteristics

### 4. Brain Atlas and Anatomical Data

#### Brain Region Exploration
- **Navigate brain hierarchies** for mouse, rat, and human brains
- **Search brain regions** by name or anatomical location
- **Access brain atlas data** with detailed anatomical information
- **Explore region-specific datasets** and associated research
- **Understand anatomical relationships** between brain areas

#### Species-Specific Data
- **Access data across species** (mouse, rat, human)
- **Compare cross-species findings** and morphologies
- **Filter data by specific strains** and experimental subjects
- **Explore species-specific brain organization** and properties

### 5. Computational Models and Simulations

#### Model Access and Analysis
- **Explore electrical models (E-models)** of neurons
- **Access morpho-electrical models (ME-models)** combining structure and function
- **Examine simulation results** and computational outputs
- **Analyze model parameters** and configurations
- **Access simulation campaigns** and their results

#### Software Documentation
- **Get documentation** for OBI (Open Brain Institute) Python packages
- **Access code examples** for entitysdk, obi-one, and neurom
- **Learn software usage** with up-to-date documentation
- **Generate code examples** for neuroscience programming tasks

### 6. Platform Navigation and Support

#### Platform Guidance
- **Get information** about Open Brain Platform features
- **Understand platform capabilities** and available data types
- **Learn about digital models** from molecular to whole-brain scales
- **Access platform news** and updates
- **Explore available notebooks** and interactive tools

#### Context-Aware Assistance
- **Understand your current location** on the platform
- **Provide relevant suggestions** based on your current view
- **Offer contextual help** for specific data types or brain regions
- **Generate personalized recommendations** for your research workflow

## Supported Data Types

### Morphological Data
- Neuron morphologies with detailed 3D structure
- Morphological classifications (M-types)
- Morphometric measurements and statistics
- Axon, dendrite, and soma properties

### Electrophysiological Data
- Ion channel recordings and properties
- Electrical cell recordings
- E-type classifications
- Membrane properties and dynamics

### Circuit Data
- Neural connectivity matrices
- Population compositions
- Synaptic properties
- Circuit metrics and statistics

### Anatomical Data
- Brain region hierarchies
- Atlas-based annotations
- Species-specific anatomical data
- Spatial coordinates and boundaries

### Simulation Data
- Model parameters and configurations
- Simulation results and outputs
- Campaign data and metadata
- Computational model properties

## Research Workflow Support

### Data Discovery
- Find relevant datasets for your research questions
- Explore available data types and formats
- Discover related research and publications
- Access comprehensive metadata and documentation

### Analysis and Computation
- Perform statistical analysis on neuroscience data
- Create visualizations and plots
- Run custom Python analysis scripts
- Generate reports and summaries

### Literature Integration
- Search relevant academic literature
- Read and analyze research papers
- Cross-reference findings with available data
- Stay updated with recent research developments

### Code Development
- Get documentation for neuroscience software packages
- Generate code examples for data analysis
- Access API documentation and usage guides
- Learn best practices for neuroscience programming

## API Capabilities and Interaction Features

### Conversation Management
- **Create and manage chat threads** with automatic title generation
- **Search through conversation history** using full-text search across all messages
- **Organize conversations** by virtual lab and project contexts
- **Paginated message retrieval** with flexible sorting and filtering options
- **Thread lifecycle management** including creation, updates, and deletion
- **Context-aware suggestions** based on current platform location and conversation history

### Interactive Tool Execution
- **Human-in-the-loop (HIL) validation** for sensitive operations requiring user approval
- **Tool call management** with accept/reject capabilities and custom feedback
- **Real-time tool execution** with status tracking and error handling
- **Tool metadata access** including parameter schemas, descriptions, and availability status
- **Dynamic tool discovery** with comprehensive tool catalogs and documentation

### File and Data Management
- **Secure file storage** with user-specific access controls
- **Presigned URL generation** for temporary file access (10-minute expiration)
- **Automatic cleanup** of associated storage when conversations are deleted
- **Plot and visualization storage** with direct chat integration
- **JSON data export** for analysis results and computational outputs

### Rate Limiting and Access Control
- **Tiered rate limiting** with different limits for inside/outside virtual lab contexts
- **Usage tracking** across different endpoint categories (chat, suggestions, title generation)
- **Project-based access validation** ensuring users can only access authorized data
- **Real-time rate limit status** with remaining quota and reset time information

### Model Selection and Configuration
- **Multiple LLM model support** with dynamic model switching
- **OpenRouter integration** for access to various AI models
- **Model-specific capabilities** including reasoning effort configuration for advanced models
- **Automatic model optimization** based on task requirements

### Streaming and Real-time Features
- **Streaming chat responses** for real-time conversation experience
- **Event-driven architecture** with proper streaming protocols
- **Background task processing** for resource-intensive operations
- **Asynchronous tool execution** with progress tracking

## Getting Started

### Basic Queries
- "Show me morphologies from the hippocampus"
- "Find recent papers on synaptic plasticity"
- "Analyze connectivity in this circuit"
- "Plot the distribution of cell types"

### Advanced Analysis
- "Compare excitatory vs inhibitory connections in layer 5"
- "Find ion channels related to specific genes"
- "Analyze morphological diversity across brain regions"
- "Generate code to access circuit data using entitysdk"

### Research Support
- "Search literature on cortical microcircuits"
- "Read this research paper for me"
- "Find documentation for obi-one package"
- "What are the latest developments in computational neuroscience?"

### Interactive Features
- **Review and approve tool calls** before execution for sensitive operations
- **Search your conversation history** to find previous analyses and results
- **Get contextual suggestions** based on your current platform location
- **Access stored files and visualizations** from previous sessions

## Limitations and Scope

### Data Access
- Access is limited to publicly available data and user-authorized datasets
- Some datasets may require specific project permissions
- Rate limiting applies to prevent system overload

### Code Execution
- Python code runs in a secure sandbox environment
- OBI-specific packages are not available in the code execution environment
- Generated code examples are for reference and external execution

### Platform UI
- Cannot provide specific UI navigation instructions
- Cannot see or interact with the platform interface directly
- Focuses on data and research capabilities rather than interface guidance

NeuroAgent serves as your intelligent research assistant, helping you navigate the complex world of neuroscience data, discover relevant research, and perform sophisticated analyses to advance your scientific understanding.