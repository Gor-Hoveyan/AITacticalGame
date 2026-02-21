export class NeuralNetwork {
    constructor(inputNodes, hiddenNodes, outputNodes) {
        this.inputNodes = inputNodes;
        this.hiddenNodes = hiddenNodes;
        this.outputNodes = outputNodes;

        // Weights from Input to Hidden
        this.weights_ih = Array.from({ length: inputNodes + 1 }, () => 
            Array.from({ length: hiddenNodes }, () => Math.random() * 2 - 1)
        );

        // Weights from Hidden to Output
        this.weights_ho = Array.from({ length: hiddenNodes + 1 }, () => 
            Array.from({ length: outputNodes }, () => Math.random() * 2 - 1)
        );

        // Pre-filled weights for a "smart" behavior based on the factors
        this.initializeHeuristicWeights();
    }

    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }

    feedForward(inputArray) {
        // Compute Hidden Layer
        let hidden = [];
        for (let j = 0; j < this.hiddenNodes; j++) {
            let sum = 0;
            for (let i = 0; i < this.inputNodes; i++) {
                sum += inputArray[i] * this.weights_ih[i][j];
            }
            // Add bias
            sum += this.weights_ih[this.inputNodes][j];
            hidden[j] = this.sigmoid(sum);
        }

        // Compute Output Layer
        let output = [];
        for (let k = 0; k < this.outputNodes; k++) {
            let sum = 0;
            for (let j = 0; j < this.hiddenNodes; j++) {
                sum += hidden[j] * this.weights_ho[j][k];
            }
            // Add bias
            sum += this.weights_ho[this.hiddenNodes][k];
            output[k] = this.sigmoid(sum);
        }

        return output;
    }

    initializeHeuristicWeights() {
        // Clear ALL weights and biases to 0 first for total control
        for(let i=0; i<this.inputNodes + 1; i++) {
            for(let j=0; j<this.hiddenNodes; j++) this.weights_ih[i][j] = 0;
        }
        for(let j=0; j<this.hiddenNodes + 1; j++) {
            for(let k=0; k<this.outputNodes; k++) this.weights_ho[j][k] = 0;
        }

        // Input indices:
        // 0: Health (0-1), 1: Melee (0-1), 2: Firearms (0-1), 3: Enemies (0-1)

        // Hidden Layer Mapping:
        // H0: Lethality (Weapons)
        // H1: Survivability (Health)
        // H2: Threat (Enemies)

        // === INPUT TO HIDDEN (STRICT ISOLATION) ===

        // H0 - Lethality: Driven exclusively by Weapons
        this.weights_ih[2][0] = 8.0;   // Firearms (Strong)
        this.weights_ih[1][0] = 6.0;   // Melee (Strong)
        this.weights_ih[this.inputNodes][0] = -5.0; // Needs at least *some* weapon to activate Lethality

        // H1 - Survivability: Driven exclusively by Health
        this.weights_ih[0][1] = 6.0;   // Health
        this.weights_ih[this.inputNodes][1] = -3.0; // Needs >50% health to be "Highly Survivable"

        // H2 - Threat: Driven exclusively by Enemies
        this.weights_ih[3][2] = 6.0;   // Enemies
        this.weights_ih[this.inputNodes][2] = -3.0; // Even 1-2 enemies is a threat

        // Output Nodes Mapping
        // Outputs: 0=Attack, 1=Retreat, 2=Evade, 3=Hide

        // Attack: Focuses on high weapons. Swarms (Threat) discourage it slightly, but Lethality overpowers fear.
        this.weights_ho[0][0] = 14.0;  // High Lethality (Buffed from 12)
        this.weights_ho[1][0] = 6.0;   // Survivability (Buffed from 4)
        this.weights_ho[2][0] = -4.0;  // Threat (Lowered penalty from -6 to -4)
        this.weights_ho[this.hiddenNodes][0] = -5.0; // Bias (Easier to trigger)

        // Retreat: Only if Threat is massive AND Lethality is low.
        this.weights_ho[2][1] = 8.0;   // Threat (Reduced from 10)
        this.weights_ho[1][1] = -6.0;  // Survivability (even more confident with health)
        this.weights_ho[0][1] = -10.0; // Lethality (weapons strongly discourage retreat)
        this.weights_ho[this.hiddenNodes][1] = -2.0; // Bias (Harder to trigger)

        // Evade: Desperation move. Very low health -> high Evade
        this.weights_ho[2][2] = 5.0;   // Threat
        this.weights_ho[1][2] = -10.0; // Survivability (LOW health -> high Evade)
        this.weights_ho[0][2] = -2.0;  // Doesn't matter if you have weapons if you are dying
        this.weights_ho[this.hiddenNodes][2] = 2.0; // Positive bias, but survivability pulls it down if health is high

        // Hide: Wait and see. Triggers moderately on high Threat if you just don't want to fight.
        this.weights_ho[2][3] = 6.0;   // Threat
        this.weights_ho[1][3] = 2.0;   // Survivability
        this.weights_ho[0][3] = -4.0;  // Lethality
        this.weights_ho[this.hiddenNodes][3] = -6.0; // Bias
    }
}
