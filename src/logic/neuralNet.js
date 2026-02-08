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
        // 0: Health (0-1), 1: Melee (0-1), 2: Firearms (0-1), 3: Ammo (0-1)
        // 4: Enemies (0-1), 5: Closeness (0-1, inverted distance), 6: Cover (0-1), 7: Stamina (0-1)

        // Hidden Layer Mapping (8 hidden nodes):
        // H0: Combat Ready, H1: In Danger, H2: Has Cover, H3: Can Move
        // H4: Offense Score, H5: Defense Score, H6: Stealth Score, H7: Evasion Score

        // === INPUT TO HIDDEN ===

        // H0 - Combat Ready: health + weapons + ammo
        this.weights_ih[0][0] = 3.0;   // Health
        this.weights_ih[2][0] = 4.0;   // Firearms
        this.weights_ih[3][0] = 3.0;   // Ammo
        this.weights_ih[1][0] = 2.0;   // Melee backup
        this.weights_ih[this.inputNodes][0] = -3.0; // Moderate threshold

        // H1 - In Danger: enemies + closeness - health
        this.weights_ih[4][1] = 5.0;   // Many enemies = danger
        this.weights_ih[5][1] = 5.0;   // Close enemies = danger
        this.weights_ih[0][1] = -3.0;  // Good health reduces danger
        this.weights_ih[this.inputNodes][1] = -2.0;

        // H2 - Has Cover: cover available
        this.weights_ih[6][2] = 6.0;   // Cover directly maps
        this.weights_ih[this.inputNodes][2] = -2.0;

        // H3 - Can Move: stamina available
        this.weights_ih[7][3] = 5.0;   // Stamina
        this.weights_ih[0][3] = 2.0;   // Health helps mobility
        this.weights_ih[this.inputNodes][3] = -2.0;

        // H4 - Offense Score (combination)
        this.weights_ih[0][4] = 4.0;   // High health
        this.weights_ih[2][4] = 5.0;   // Firearms
        this.weights_ih[3][4] = 4.0;   // Ammo
        this.weights_ih[4][4] = -2.0;  // Fewer enemies better for offense
        this.weights_ih[this.inputNodes][4] = -4.0;

        // H5 - Defense Score
        this.weights_ih[0][5] = -4.0;  // Low health = need defense
        this.weights_ih[4][5] = 4.0;   // Many enemies
        this.weights_ih[5][5] = 4.0;   // Close enemies
        this.weights_ih[this.inputNodes][5] = -3.0;

        // H6 - Stealth Score
        this.weights_ih[6][6] = 6.0;   // Cover
        this.weights_ih[4][6] = 3.0;   // Enemies present
        this.weights_ih[5][6] = -2.0;  // Too close = can't hide
        this.weights_ih[this.inputNodes][6] = -3.0;

        // H7 - Evasion Score
        this.weights_ih[7][7] = 5.0;   // Stamina
        this.weights_ih[5][7] = 3.0;   // Close enemies = need evasion
        this.weights_ih[6][7] = -2.0;  // If cover, don't need evasion
        this.weights_ih[this.inputNodes][7] = -3.0;

        // === HIDDEN TO OUTPUT ===
        // Outputs: 0=Attack, 1=Retreat, 2=Evade, 3=Hide

        // Attack (when combat ready AND offense score high)
        this.weights_ho[0][0] = 6.0;   // Combat Ready -> Attack
        this.weights_ho[4][0] = 6.0;   // Offense Score -> Attack
        this.weights_ho[1][0] = -4.0;  // In Danger discourages Attack
        this.weights_ho[this.hiddenNodes][0] = -2.0;

        // Retreat (when in danger AND low defense options)
        this.weights_ho[1][1] = 6.0;   // In Danger -> Retreat
        this.weights_ho[5][1] = 5.0;   // Defense Score -> Retreat
        this.weights_ho[0][1] = -5.0;  // Combat Ready discourages Retreat
        this.weights_ho[2][1] = -3.0;  // Has Cover discourages Retreat (hide instead)
        this.weights_ho[this.hiddenNodes][1] = -3.0;

        // Evade (when can move AND moderate danger)
        this.weights_ho[3][2] = 5.0;   // Can Move -> Evade
        this.weights_ho[7][2] = 5.0;   // Evasion Score -> Evade
        this.weights_ho[1][2] = 2.0;   // Danger helps Evade
        this.weights_ho[2][2] = -3.0;  // Has Cover discourages Evade (hide instead)
        this.weights_ho[this.hiddenNodes][2] = -2.0;

        // Hide (when has cover AND enemies present)
        this.weights_ho[2][3] = 7.0;   // Has Cover -> Hide
        this.weights_ho[6][3] = 6.0;   // Stealth Score -> Hide
        this.weights_ho[0][3] = -4.0;  // Combat Ready discourages hiding
        this.weights_ho[this.hiddenNodes][3] = -2.0;
    }
}
