import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { authApi } from '@/api/auth'

const forgotSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
})

type ForgotData = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotData>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotData) => {
    setIsLoading(true)
    try {
      await authApi.forgotPassword(data.email)
      setSent(true)
      toast('success', 'Email enviado!', 'Verifique sua caixa de entrada')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message: string } } }).response?.data
              ?.message
          : 'Erro ao enviar email'
      toast('error', 'Erro', msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">TD</span>
          </div>
          <h1 className="text-2xl font-bold text-text">
            {sent ? 'Email Enviado' : 'Recuperar Senha'}
          </h1>
          <p className="text-text-secondary mt-1">
            {sent
              ? 'Enviamos um link de recuperação para seu email'
              : 'Digite seu email para receber o link de recuperação'}
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-success" />
            </div>
            <p className="text-sm text-text-secondary">
              Se não encontrar o email, verifique sua caixa de spam ou tente
              novamente.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                <Send className="h-4 w-4" />
                Enviar Link
              </Button>
            </form>

            <div className="text-center mt-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
