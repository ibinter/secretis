import React from 'react';
import { Calendar as CalIcon } from 'lucide-react';

// ErrorBoundary local pour FullCalendar
class CalendarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-4">
            <CalIcon size={28} className="text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Calendrier en cours de chargement
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Le composant de calendrier interactif rencontre une incompatibilité technique.
            Rechargez la page ou utilisez la liste des événements ci-contre.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrapper lazy qui charge FullCalendar
const FullCalendarLazy = React.lazy(() =>
  import('@fullcalendar/react').then(mod => {
    return import('@fullcalendar/daygrid').then(dg =>
      import('@fullcalendar/timegrid').then(tg =>
        import('@fullcalendar/list').then(li =>
          import('@fullcalendar/interaction').then(inter =>
            import('@fullcalendar/core/locales/fr').then(fr => ({
              default: (props) => {
                const FC = mod.default;
                return React.createElement(FC, {
                  ...props,
                  plugins: [dg.default, tg.default, li.default, inter.default],
                  locale: fr.default,
                });
              }
            }))
          )
        )
      )
    );
  })
);

export default function CalendarWrapper(props) {
  return (
    <CalendarErrorBoundary>
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <FullCalendarLazy {...props} />
      </React.Suspense>
    </CalendarErrorBoundary>
  );
}
