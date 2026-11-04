# Guía Oficial de Compilación Android APK — IPS TECNOLÓGICA

Este proyecto incluye la configuración lista para empaquetar **IPS TECNOLÓGICA CATALOG STUDIO** como una aplicación nativa Android (`.apk` / `.aab`) mediante **Capacitor** y **Android Studio**, conectada en tiempo real con el catálogo público, promociones y pedidos.

---

## 1. Datos Oficiales del Paquete Android

- **Nombre de la aplicación**: `IPS TECNOLÓGICA`
- **Nombre corto**: `IPS Tech`
- **ID del paquete (`applicationId`)**: `co.ipstecnologica.catalogo`
- **Color de tema**: `#DC2626` (Rojo corporativo)
- **Color de fondo / Splash**: `#111827` (Grafito corporativo)
- **URL pública conectada**: `https://ais-pre-ouzmtvpcklhtkaxl7txrq4-235668912498.us-west2.run.app`

---

## 2. Requisitos Previos en tu Computador

1. **Node.js 20+** instalado.
2. **Android Studio (Koala / Ladybug o superior)** con Android SDK (API 34+) y JDK 17.

---

## 3. Pasos para Generar el Proyecto Android y Compilar el APK

Ejecuta los siguientes comandos en la raíz del proyecto:

```bash
# 1. Instalar dependencias web y compilar la versión de producción
npm install
npm run build

# 2. Instalar Capacitor CLI y plataforma Android (primera vez)
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android

# 3. Sincronizar los archivos compilados (dist/) y capacitor.config.json con Android
npx cap sync android
```

---

## 4. Generar APK de Prueba (Debug APK)

Para generar rápidamente un archivo `.apk` instalable de prueba desde la terminal o Android Studio:

### Opción A: Desde Android Studio
1. Abre la carpeta `android` en Android Studio:
   ```bash
   npx cap open android
   ```
2. En el menú superior selecciona **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. El archivo APK se generará en:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### Opción B: Desde la línea de comandos (Gradle)
```bash
cd android
./gradlew assembleDebug
```

---

## 5. Generar APK Firmado para Producción (Release APK)

1. Crea tu llave de firma (`keystore`) si aún no tienes una:
   ```bash
   keytool -genkey -v -keystore ips-tecnologica-release.keystore -alias ipstech -keyalg RSA -keysize 2048 -validity 10000
   ```
2. En Android Studio ve a **Build → Generate Signed Bundle / APK...** y selecciona **APK**.
3. Elige tu archivo `ips-tecnologica-release.keystore`, ingresa la contraseña y selecciona la variante **release**.
4. Para actualizar la versión en `android/app/build.gradle`:
   ```groovy
   defaultConfig {
       applicationId "co.ipstecnologica.catalogo"
       minSdkVersion 23
       targetSdkVersion 34
       versionCode 2
       versionName "1.1.0"
   }
   ```

---

## 6. Publicar el APK en el Panel Administrativo de IPS TECNOLÓGICA

1. Inicia sesión en el catálogo web con tu cuenta de administrador (`jeffervr@gmail.com`).
2. Abre la sección **Gestión de la App (PWA & APK)** en el menú lateral.
3. Sube el archivo `.apk` compilado o verifica su URL de descarga y actualiza el número de versión.
4. Una vez verificado el archivo real, el botón **DESCARGAR APK ANDROID** se activará automáticamente en la sección pública **DESCARGA NUESTRA APP**.
