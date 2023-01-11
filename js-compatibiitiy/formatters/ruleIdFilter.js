const SIMPLE_RULE_IDs = ["no-restricted-global", "no-restricted-modules", "no-undef"]
function isSampleRuleId(ruleId) {
    return SIMPLE_RULE_IDs.includes(ruleId);
}

function isCodeErrorRuleId(messageObj) {
    return !messageObj.message.startsWith('Definition for rule');
}

module.exports = {
    isSampleRuleId,
    isCodeErrorRuleId
};
