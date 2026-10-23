// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default defineConfig(
	{
		// No analiza el propio archivo de configuración ni los archivos que genera Next
		ignores: ['eslint.config.mjs', '.next/**', 'out/**', 'next-env.d.ts'],
	},
	// Reglas base de ESLint para JavaScript
	// Las referencias a variables inexistentes o fuera de ámbito las detecta el compilador de TypeScript
	eslint.configs.recommended,
	// Reglas de TypeScript que usan la información de tipos del proyecto para prevenir errores
	// relacionados con los datos (acceso inseguro a valores, argumentos con tipos incorrectos, etc.)
	// También cubre por defecto las promesas ignoradas, el uso incorrecto de async y await,
	// los throw de valores que no son Error, los catch inútiles y los bloques vacíos,
	// además de las importaciones con require()
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				// Obtiene la información de tipos del tsconfig del proyecto
				projectService: true,
				// Resuelve el tsconfig desde la carpeta de este archivo
				tsconfigRootDir: import.meta.dirname,
			},
		},
		// Plugin que ordena las importaciones
		plugins: {
			'simple-import-sort': simpleImportSort,
		},
		rules: {
			// Detecta variables, parámetros e importaciones que se declaran pero nunca se usan
			// (se ignoran las que empiezan con guion bajo, que se declaran a propósito sin usar)
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
			],

			// Detecta importaciones repetidas del mismo módulo, que son innecesarias
			'no-duplicate-imports': 'error',

			// Ordena las importaciones en grupos separados por una línea en blanco:
			// efectos secundarios, paquetes (react y next primero), alias @/ y rutas relativas
			'simple-import-sort/imports': [
				'error',
				{
					groups: [['^\\u0000'], ['^react$', '^next', '^@?\\w'], ['^@/'], ['^\\.']],
				},
			],

			// Limita el uso de any, que desactiva la comprobación de tipos del valor
			'@typescript-eslint/no-explicit-any': 'warn',

			// Obliga a tratar el error de .catch() como unknown y no como any
			'@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',

			// Detecta promesas usadas donde no se esperan, salvo en los atributos de JSX
			// (react-hook-form entrega handleSubmit(async ...) a onSubmit, que es un uso correcto)
			'@typescript-eslint/no-misused-promises': [
				'error',
				{ checksVoidReturn: { attributes: false } },
			],
		},
	},
);
