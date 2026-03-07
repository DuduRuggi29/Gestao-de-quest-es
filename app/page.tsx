import QuestionGenerator from '@/components/QuestionGenerator';
import { BookOpenCheck } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-100/50 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-32 -left-24 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl mb-6 shadow-sm">
            <BookOpenCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            Questões <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">Infinitas</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
            Gere questões inéditas de matemática para concursos públicos.
            Escolha a banca, o tema e o nível de dificuldade para praticar sem limites.
          </p>
        </div>

        {/* Main Content */}
        <QuestionGenerator />
      </div>
    </main>
  );
}
