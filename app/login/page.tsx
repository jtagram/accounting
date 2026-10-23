'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Form } from 'react-bootstrap';

interface LoginErrorResponse {
	message?: string;
}

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => null)) as LoginErrorResponse | null;
				setError(data?.message ?? 'No se pudo iniciar sesión.');
				return;
			}

			router.push('/');
			router.refresh();
		} catch {
			setError('No se pudo conectar con el servidor.');
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div
			className='d-flex flex-grow-1 align-items-center justify-content-center bg-light px-3'
			style={{ minHeight: '100vh' }}
		>
			<Card
				style={{ width: '100%', maxWidth: 380 }}
				className='shadow-sm'
			>
				<Card.Body className='p-4'>
					<Card.Title
						as='h1'
						className='h4 mb-4'
					>
						Iniciar sesión
					</Card.Title>

					<Form onSubmit={handleSubmit}>
						<Form.Group
							className='mb-3'
							controlId='email'
						>
							<Form.Label>Correo electrónico</Form.Label>
							<Form.Control
								type='email'
								required
								autoComplete='email'
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</Form.Group>

						<Form.Group
							className='mb-4'
							controlId='password'
						>
							<Form.Label>Contraseña</Form.Label>
							<Form.Control
								type='password'
								required
								autoComplete='current-password'
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</Form.Group>

						{error && (
							<Alert
								variant='danger'
								role='alert'
							>
								{error}
							</Alert>
						)}

						<Button
							type='submit'
							variant='dark'
							disabled={isSubmitting}
							className='w-100'
						>
							{isSubmitting ? 'Ingresando…' : 'Ingresar'}
						</Button>
					</Form>
				</Card.Body>
			</Card>
		</div>
	);
}
