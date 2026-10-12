# 5kmocks

Free mock exams for the big IT certs, part of the 5kable family. Plain static site: no build step, no backend.

## Exams
ITIL Foundation, CCNA 200-301, AZ-104, AZ-900, MS-900, MD-102, SC-900, CompTIA A+ Core 1 & 2, Network+, Security+, AWS SAA-C03.

## Features
- **Exam mode**: timed at the real exam's pace, flag for review, question navigator, auto-submit when time runs out
- **Practice mode**: untimed, instant answer and explanation
- Results split by exam domain, review wrong/flagged answers, retry just the ones you got wrong
- Attempt history saved in the browser (localStorage), no account needed
- Keyboard: A-E (or 1-5) to answer, arrow keys to move, F to flag

## Structure
```
index.html        landing page + exam catalogue
exam.html         exam engine (exam.html?cert=<id>)
assets/certs.js   exam catalogue: real exam length, time, pass mark, domains
assets/exam.js    lobby / exam / results logic
assets/home.js    catalogue page
data/<id>.js      question banks
```

## Adding questions
Add to the relevant `data/<id>.js`:
```js
{ d: 'Domain name', q: 'Question?', o: ['Correct', 'Wrong', 'Wrong', 'Wrong'], a: 0, e: 'Explanation.' }
```
`d` must match one of the cert's `domains` in `assets/certs.js`. Options are shuffled at runtime, so the correct one can sit anywhere. For "Which TWO" questions use an array, e.g. `a: [0, 1]`.

To add a new cert: add an entry to `assets/certs.js`, create `data/<id>.js`, and add its `<script>` tag to `index.html`.

## Running locally
```
python -m http.server 8000
```
then open http://localhost:8000.

## Deploying
Works as-is on Cloudflare Pages (same as 5kable-site): no build command, output directory `/`.

Questions are original and written to match the published exam objectives. Not affiliated with PeopleCert, Cisco, Microsoft, CompTIA or AWS.
