/**
 * @fileoverview csv-style formatter.
 * @author javen
 */
"use strict";

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
        return "Error";
    }
    return "Warning";
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports = function (results) {
    let output = "File,LineNo,ColumnNo,Level,RuleId,ErrorMessage\n";
    results.forEach(result => {
        const messages = result.messages;
        messages.forEach((message) => {
            output += `${result.filePath},`;
            output += `${message.line || 0},`;
            output += `${message.column || 0},`;
            output += `${getMessageType(message)},`;
            output += `${message.ruleId ? `${message.ruleId}` : ""},`;
            output += `"${message.message}",`;
            output += "\n";
        });

    });
    
    return output;
}
