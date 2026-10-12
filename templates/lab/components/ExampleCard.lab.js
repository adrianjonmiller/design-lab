export default {
  states: {
    Default: {
      props: { title: 'Weekly summary', body: 'You shipped 12 changes and closed 4 issues this week.' },
    },
    Accent: {
      props: { title: 'New feature', body: 'Try the redesigned dashboard.', tone: 'accent' },
      slots: { default: 'Released today' },
    },
    Warning: {
      props: { title: 'Storage almost full', body: 'You have used 92% of your plan.', tone: 'warning' },
    },
    Loading: { props: { loading: true } },
    'Long content': {
      props: {
        title: 'A considerably longer title that has to wrap onto a second line',
        body: 'Long copy is where layouts break first, so every component should have a state like this one.',
      },
    },
  },
}
