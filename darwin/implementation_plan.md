# AlphaEvolve Implementation Plan (Revised)

This document outlines a comprehensive plan to implement the AlphaEvolve framework, correctly incorporating its core evolutionary mechanisms as described in the paper.

### **Clarifying the Core Components**

The key to AlphaEvolve is the separation of the **Mutator** (the LLM that generates changes) from the **Selector** (the evolutionary database that guides the process). 

*   **`Evolver` Agent:** The LLM-powered mutator.
*   **`ProgramDatabase`:** The intelligent selector and archivist, which implements quality-diversity algorithms.

### **Revised Implementation Plan**

**Phase 1: Core Components**

1.  **`FeatureExtractor` Tool (New Component)**
    *   **Type:** `FunctionTool`.
    *   **Purpose:** To analyze a program and extract a vector of its characteristics. This is essential for the MAP-Elites algorithm.
    *   **Example Features:** `performance_score`, `execution_time`, `code_complexity`, `memory_usage`.

2.  **`ProgramDatabase` (with MAP-Elites)**
    *   **Type:** A standard Python class implementing the MAP-Elites algorithm.
    *   **Purpose:** To maintain a diverse archive of high-performing programs. It will store programs in a grid structured by their features (as determined by the `FeatureExtractor`).
    *   **`add(program, features)` method:** Places a new program into the grid based on its features, replacing an existing program only if the new one has a higher performance score for that specific feature niche.
    *   **`sample()` method:** Samples a diverse set of parent programs and "inspirations" by selecting elites from various cells of the grid, promoting creativity.

3.  **`Evolver` Agent**
    *   **Type:** `LlmAgent`.
    *   **Purpose:** Acts as the mutator. It receives a prompt containing diverse examples from the `ProgramDatabase` and generates a code `diff`.

4.  **`evaluate_program` Tool**
    *   **Type:** `FunctionTool`.
    *   **Purpose:** Executes the user's evaluation code against a program to get its primary performance score.

**Phase 2: The Central Controller Agent**

1.  **`AlphaEvolveController` Agent**
    *   **Type:** Custom `BaseAgent` (the `root_agent`).
    *   **Purpose:** Orchestrates the evolutionary process.
    *   **Implementation (`_run_async_impl` method):**
        1.  Initialize the `ProgramDatabase`.
        2.  Begin the main evolutionary loop.
        3.  **Inside the loop:**
            *   `parent_program, inspirations = database.sample()`
            *   Build the prompt and invoke the `Evolver` agent to get a `diff`.
            *   Apply the `diff` to create the `child_program`.
            *   Invoke the `evaluate_program` tool to get the main `performance_score`.
            *   **Invoke the `FeatureExtractor` tool** to get the other features of the `child_program`.
            *   `database.add(child_program, all_features)`

**Phase 3: Island Model and Deployment**

1.  **Island Model Architecture:**
    *   The `AlphaEvolveController` can be configured to manage **multiple instances** of the `ProgramDatabase`, where each instance acts as an "island."
    *   The controller will run the evolutionary loop on each island independently for a number of generations.
    *   Periodically, it will perform **migration**, sampling the best elites from one island and seeding them into another to cross-pollinate successful traits.

2.  **Testing and Deployment:**
    *   The plan for system-level testing with `adk eval` and deployment to Vertex AI Agent Engine remains the same.
