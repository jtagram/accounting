# accounting

## Variables de entorno

- `IAM_API_URL`: URL desde la que este frontend alcanza a `iam-api`. Se usa para el login.
- `ACCOUNTING_APPLICATION_NAME`: nombre de esta aplicación (origen) registrado en `iam-api`. Se envía como `x-origin-application` al hacer login.
- `ACCOUNTING_TARGET_APPLICATION_NAME`: aplicación destino para la que se emite el token. Se envía como `x-target-application` al hacer login.
- `ACCOUNTING_API_URL`: URL desde la que este frontend alcanza a `accounting-api` (sin barra final). Se usa para procesar clientes con el token del usuario (rol ADMIN). Las ejecuciones pueden tardar muchos minutos: cualquier ingress o proxy intermedio debe permitir timeouts de lectura largos.

Desarrollo: `npm run dev` (puerto 3010).
