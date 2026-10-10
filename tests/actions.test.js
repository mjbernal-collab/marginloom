import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewerRequest} from '../src/actions.js';
test('reviewer requests invoke an action while questions about making one stay in chat',()=>{
 for(const text of ['Create a reviewer','Can you make a reviewer for Java?','Please generate a study guide from my notes'])assert.ok(reviewerRequest(text));
 for(const text of ['How do I create a reviewer?','What makes a good reviewer?','Explain full adders'])assert.equal(reviewerRequest(text),false);
});
