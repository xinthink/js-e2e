/**
 * @fileoverview csv-style formatter.
 * @author javen
 */
"use strict";

const chalk = require("chalk");
const ruleIdFilter = require('./ruleIdFilter');

//------------------------------------------------------------------------------
// Helper Functions
//------------------------------------------------------------------------------

/**
 * Returns a canonical error level string based upon the error message passed in.
 * @param {Object} message Individual error message provided by eslint
 * @returns {string} Error level string
 */
function getMessageType(message) {
    if (message.fatal || message.severity === 2) {
        return chalk.red("Error");
    }
    return chalk.yellow("Warning");
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports = function (results) {
    let output = "",
        total = 0;
    results.forEach(result => {
        const messages = result.messages;
        messages.forEach((message) => {
            if (ruleIdFilter.isSampleRuleId(message.ruleId) && ruleIdFilter.isCodeErrorRuleId(message)) {
                total++;
                output += `${result.filePath}:${message.line || 0}:${message.column || 0}, `;
                output += `${getMessageType(message)}, `;
                output += `${message.ruleId ? `${message.ruleId}` : ""}, `;
                output += `${message.message}`;
                output += "\n";
            }
        });
    });

    if (total > 0) {
        output += chalk.red(`\n${total} problem${total !== 1 ? "s" : ""}`);
    } else {
        output += chalk.green(`no problem`);
    }

    // Resets output color, for prevent change on top level
    return chalk.reset(output);
}
