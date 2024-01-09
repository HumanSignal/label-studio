import config from './config.xml';

const tasks = [{
  data: {
    text: 'Albert Einstein (/ˈaɪnstaɪn/ EYEN-styne;[6] German: [ˈalbɛʁt ˈʔaɪnʃtaɪn] (listen); 14 March 1879 – 18 April 1955) was a German-born theoretical physicist,[7] widely acknowledged to be one of the greatest and most influential physicists of all time. Einstein is best known for developing the theory of relativity, but he also made important contributions to the development of the theory of quantum mechanics. Relativity and quantum mechanics are together the two pillars of modern physics.[3][8] His mass–energy equivalence formula E = mc2, which arises from relativity theory, has been dubbed "the world\'s most famous equation".[9] His work is also known for its influence on the philosophy of science.[10][11] He received the 1921 Nobel Prize in Physics "for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect",[12] a pivotal step in the development of quantum theory. His intellectual achievements and originality resulted in "Einstein" becoming synonymous with "genius".[13]',
  },
}];

const annotation = {
  annotations: [
    { id: '1', result: [
      { 'value': { 'start': 83, 'end': 96, 'text': '14 March 1879', 'labels': ['birth'] }, 'id': 'NLn3WDm6w2', 'from_name': 'label', 'to_name': 'text', 'type': 'labels' },
      { 'value': { 'start': 83, 'end': 96, 'text': '14 March 1879', 'datetime': '1879-03-14' } , 'id': 'NLn3WDm6w2', 'from_name': 'date', 'to_name': 'text', 'type': 'datetime' },
      { 'value': { 'start': 99, 'end': 112, 'text': '18 April 1955', 'labels': ['death'] }, 'id': '7vVaxtYJIc', 'from_name': 'label', 'to_name': 'text', 'type': 'labels' },
      { 'value': { 'start': 99, 'end': 112, 'text': '18 April 1955', 'datetime': '1955-04-18' } , 'id': '7vVaxtYJIc', 'from_name': 'date', 'to_name': 'text', 'type': 'datetime' },
      { 'value': { 'start': 728, 'end': 755, 'text': '1921 Nobel Prize in Physics', 'labels': ['event'] }, 'id': 'cnFnKW7CR5', 'from_name': 'label', 'to_name': 'text', 'type': 'labels' },
      { 'value': { 'start': 728, 'end': 755, 'text': '1921 Nobel Prize in Physics', 'datetime': '1921-12-10' } , 'id': 'cnFnKW7CR5', 'from_name': 'date', 'to_name': 'text', 'type': 'datetime' },
      { 'value': { 'datetime': '24.06.2022 17:01' }, 'id': 'xiMzVHO9fw', 'from_name': 'full', 'to_name': 'text', 'type': 'datetime' },
    ] },
  ],
};

export const DateTime = { config, tasks, annotation };
