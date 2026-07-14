import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Calendar,
  ClipboardCheck,
  BarChart3,
  Shield,
  Clock,
  Smartphone,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

const features = [
  {
    icon: Calendar,
    title: 'Agendamentos',
    description:
      'Gerencie agendamentos de forma intuitiva com calendário integrado.',
  },
  {
    icon: ClipboardCheck,
    title: 'Ordens de Serviço',
    description:
      'Controle completo de ordens com checklist digital e fotos do antes/depois.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description:
      'Acompanhe métricas de faturamento, serviços mais realizados e desempenho.',
  },
  {
    icon: Shield,
    title: 'Controle de Qualidade',
    description:
      'Checklist detalhado para garantir a qualidade em cada serviço.',
  },
  {
    icon: Clock,
    title: 'Tempo Real',
    description:
      'Acompanhe o status dos serviços em tempo real com notificações.',
  },
  {
    icon: Smartphone,
    title: 'Multiplataforma',
    description:
      'Acesse de qualquer dispositivo com interface responsiva e moderna.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Cadastre o Cliente',
    description: 'Adicione os dados do cliente e do veículo.',
  },
  {
    number: '02',
    title: 'Agende o Serviço',
    description: 'Escolha o serviço e agende no calendário.',
  },
  {
    number: '03',
    title: 'Realize o Checklist',
    description: 'Faça o checklist digital com fotos do veículo.',
  },
  {
    number: '04',
    title: 'Finalize e Receba',
    description: 'Finalize a ordem e gerencie o pagamento.',
  },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">TD</span>
              </div>
              <span className="font-semibold text-text">TMAD Detail</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Entrar
              </Button>
              <Button onClick={() => navigate('/register')}>
                Cadastre-se
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
              <CheckCircle2 className="h-4 w-4" />
              Sistema completo para detalhamento automotivo
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text leading-tight mb-6 animate-slide-up">
              Gerencie sua{' '}
              <span className="text-gradient">oficina de detalhamento</span>{' '}
              com eficiência
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary mb-8 max-w-2xl mx-auto animate-slide-up">
              TMAD Detail é o sistema completo para gerenciar agendamentos,
              ordens de serviço, checklist digital e muito mais.
            </p>
            <div className="flex items-center justify-center gap-4 animate-slide-up">
              <Button size="lg" onClick={() => navigate('/register')}>
                Começar Grátis
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/login')}
              >
                Fazer Login
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text mb-3">
              Tudo que sua oficina precisa
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Funcionalidades pensadas para otimizar seu trabalho e encantar
              seus clientes.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-background border border-border hover:shadow-card-lg transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  <feature.icon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text mb-3">
              Como Funciona
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Em apenas 4 passos você gerencia todo o fluxo da sua oficina.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center relative">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-text-secondary">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-sidebar">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para transformar sua oficina?
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Comece agora e descubra como o TMAD Detail pode ajudar a
            organizar e fazer seu negócio crescer.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/register')}
            className="bg-primary hover:bg-primary-dark"
          >
            Começar Gratuitamente
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-xs">TD</span>
              </div>
              <span className="text-sm text-text-secondary">
                © 2024 TMAD Detail. Todos os direitos reservados.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="#"
                className="text-sm text-text-secondary hover:text-text transition-colors"
              >
                Termos
              </a>
              <a
                href="#"
                className="text-sm text-text-secondary hover:text-text transition-colors"
              >
                Privacidade
              </a>
              <a
                href="#"
                className="text-sm text-text-secondary hover:text-text transition-colors"
              >
                Contato
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
