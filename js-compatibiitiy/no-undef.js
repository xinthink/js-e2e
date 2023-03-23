/**
 * @fileoverview Rule to flag references to undeclared variables.
 * @author Mark Macdonald
 */
"use strict";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Checks if the given node is the argument of a typeof operator.
 * @param {ASTNode} node The AST node being checked.
 * @returns {boolean} Whether or not the node is the argument of a typeof operator.
 */
function hasTypeOfOperator(node) {
    const parent = node.parent;

    if (parent.type === "UnaryExpression") {    // typeof define == 'function'
        return parent.operator === "typeof";
    }

    // if (parent.type === "MemberExpression") {
    //     if (parent.parent.type === "LogicalExpression") {  // o = "function" == typeof define && define.amd
    //         return isTypeOfBinaryExpression(parent.parent.left, node.name);
    //     } else if (parent.parent.type === "BinaryExpression") { // typeof define && define.amd == 'amd'
    //         return isTypeOfBinaryExpression(parent.parent.parent.left, node.name);
    //     }
    // } else if (parent.type === "LogicalExpression") {   // var freeSelf = typeof self == 'object' && self
    //     return isTypeOfBinaryExpression(parent.left, node.name);
    // }

    let logicNode = parent;
    while (logicNode.type !== "Program") {
        if (logicNode.type === "LogicalExpression") {
            if (isTypeOfBinaryExpression(logicNode.left, node.name)) {
                return true;
            }
        } else if (logicNode.type === "IfStatement" || logicNode.type === "ConditionalExpression") {
            if (isTypeOfBinaryExpression(logicNode.test, node.name)) {
                return true;
            }
        }

        logicNode = logicNode.parent;
    }

    return false;
}

function isTypeOfIdentifier(node, identifierName) {
    if (node.type === "BinaryExpression") {
        if (node.left.type === "UnaryExpression") { // typeof define == "function"
            return node.left.operator === "typeof" && node.left.argument.name === identifierName
        } else if (node.right.type === "UnaryExpression") { // "function" == typeof define
            return node.right.operator === "typeof" && node.right.argument.name === identifierName
        }
    }

    return false;
}

function isTypeOfBinaryExpression(node, identifierName) {
    if (node.type === "LogicalExpression") {
        return isTypeOfBinaryExpression(node.left, identifierName) || isTypeOfBinaryExpression(node.right, identifierName);
    } else {
        return isTypeOfIdentifier(node, identifierName);
    }

    return false;
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('../shared/types').Rule} */
module.exports = {
    meta: {
        type: "problem",

        docs: {
            description: "Disallow the use of undeclared variables unless mentioned in `/*global */` comments",
            recommended: true,
            url: "https://eslint.org/docs/rules/no-undef"
        },

        schema: [
            {
                type: "object",
                properties: {
                    typeof: {
                        type: "boolean",
                        default: false
                    }
                },
                additionalProperties: false
            }
        ],
        messages: {
            undef: "'{{name}}' is not defined."
        }
    },

    create(context) {
        const options = context.options[0];
        const considerTypeOf = options && options.typeof === true || false;

        return {
            "Program:exit"(/* node */) {
                const globalScope = context.getScope();

                globalScope.through.forEach(ref => {
                    const identifier = ref.identifier;

                    if (!considerTypeOf && hasTypeOfOperator(identifier)) {
                        return;
                    }

                    context.report({
                        node: identifier,
                        messageId: "undef",
                        data: identifier
                    });
                });
            }
        };
    }
};
