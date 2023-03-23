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

    if (parent.type === "UnaryExpression") {
        return parent.operator === "typeof";
    }

    if (parent.type === "MemberExpression") {
        let logicNode = parent.parent;
        if (logicNode.type === "BinaryExpression") {
            logicNode = logicNode.parent;
        }

        while (logicNode.type === "LogicalExpression") {
            if (isTypeOfBinaryExpression(logicNode.left, node.name)) {
                return true;
            }

            logicNode = logicNode.parent;
        }
    } else if (parent.type === "LogicalExpression") {   // var freeSelf = typeof self == 'object' && self
        let logicNode = parent;
        while (logicNode.type === "LogicalExpression") {
            if (isTypeOfBinaryExpression(logicNode.left, node.name)) {
                return true;
            }

            logicNode = logicNode.parent;
        }
    }

    return false;
}

function isTypeOfBinaryExpression(node, identifierName) {
    if (node.type === "BinaryExpression") {
        if (node.left.type === "UnaryExpression") { // typeof define == "function"
            return node.left.operator === "typeof" && node.left.argument.name === identifierName
        } else if (node.right.type === "UnaryExpression") { // "function" == typeof define
            return node.right.operator === "typeof" && node.right.argument.name === identifierName
        }
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
