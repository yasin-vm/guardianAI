import fetch from 'node:fetch';
const random = Math.random().toString(36).slice(2, 8);
const parentEmail = `testparent_${random}@example.com`;
const badChildEmail = `badchild_${random}@example.com`;
const goodChildEmail = `goodchild_${random}@example.com`;

const parentRes = await fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Test Parent', email: parentEmail, password: 'Password1!', role: 'parent' }),
});
const parentData = await parentRes.json();
console.log('parent', parentRes.status, parentData);

const badChildRes = await fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Bad Child', email: badChildEmail, password: 'Password1!', role: 'child', familyCode: 'INVALID' }),
});
const badChildData = await badChildRes.json();
console.log('bad child', badChildRes.status, badChildData);

const goodChildRes = await fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Good Child', email: goodChildEmail, password: 'Password1!', role: 'child', familyCode: parentData.familyCode }),
});
const goodChildData = await goodChildRes.json();
console.log('good child', goodChildRes.status, goodChildData);
