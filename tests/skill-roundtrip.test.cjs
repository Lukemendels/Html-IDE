const assert=require('assert'),fs=require('fs');const s=fs.readFileSync('local-ide.src.html','utf8');
assert(s.includes('currentSkillTemplate'));assert(s.includes('skillTemplate: state.currentSkillTemplate'));assert(s.includes('function extractGeneratedSkill('));assert(s.includes('Unmarked stickshift-skill conflicts'));
assert(s.includes('serializeSkillForDataBlock(renderSkillMarkdown(skillTemplate'));
assert(!/function compileAppSource[\s\S]{0,500}ssGetSetting/.test(s));
console.log('skill roundtrip architecture tests passed');
