"""Сборка RDF/XML, реальный HermiT, сравнение с Prolog и негативные проверки."""
import json
import os
from pathlib import Path
import subprocess
import rdflib
import owlready2 as ow

ROOT = Path(__file__).resolve().parent
if os.environ.get('JAVA_EXE'):
    ow.JAVA_EXE = os.environ['JAVA_EXE']


def load_world():
    world = ow.World()
    return world, world.get_ontology((ROOT / 'games_ontology.owl').as_uri()).load()


def main():
    graph = rdflib.Graph().parse(ROOT / 'games_ontology.ttl', format='turtle')
    graph.serialize(ROOT / 'games_ontology.owl', format='xml')
    assert rdflib.compare.isomorphic(graph, rdflib.Graph().parse(ROOT / 'games_ontology.owl'))
    world, onto = load_world()
    ow.sync_reasoner(world, infer_property_values=True, debug=0)
    pairs = {
        'SoloStoryGame': 'solo_story_game',
        'FriendlyMultiplayerGame': 'friendly_multiplayer',
        'IntenseGame': 'intense_game',
        'IndieGem': 'indie_gem',
        'RelaxingSoloGame': 'relaxing_solo_game',
        'BeginnerRecommendedGame': 'recommended_for_beginner',
        'RuleVerifiedStoryGame': 'solo_story_game',
    }
    results = {}
    for cls, pred in pairs.items():
        actual = sorted(x.name for x in onto[cls].instances())
        goal = f"findall(G,{pred}(G),L),sort(L,S),json_write(current_output,S),halt"
        expected = json.loads(subprocess.check_output([
            'swipl', '-q', '-s', str(ROOT.parent / 'games.pl'),
            '-g', 'use_module(library(http/json)),' + goal], text=True))
        assert actual == expected, (cls, actual, expected)
        results[cls] = actual
    assert sorted(x.name for x in onto.valve.developedGame) == ['counter_strike_2', 'portal_2']
    assert onto.SinglePlayerGame in onto.SoloStoryGame.ancestors()
    assert not list(world.inconsistent_classes())
    ns = {'g': 'http://example.org/itmo/games#'}
    query = 'SELECT ?g WHERE {?g a g:StoryDrivenGame . FILTER NOT EXISTS {?g g:developedBy g:valve}} ORDER BY ?g'
    results['SPARQL_story_not_valve'] = [str(r[0]).split('#')[-1] for r in graph.query(query, initNs=ns)]
    assert results['SPARQL_story_not_valve'] == ['baldurs_gate_3','celeste','cyberpunk_2077','hades','hollow_knight','the_witcher_3']
    # Проверяем нарушения на отдельных мирах: исходный файл не меняется.
    for case in ['disjoint', 'datatype', 'cardinality']:
        bad_world, bad = load_world()
        if case == 'disjoint':
            bad.minecraft.is_a.append(bad.CompetitiveGame)
        elif case == 'datatype':
            bad.minecraft.title = 42
        else:
            # Два различных строковых значения нарушают exactly 1.
            g = bad_world.as_rdflib_graph()
            with bad:
                g.add((rdflib.URIRef(bad.minecraft.iri), rdflib.URIRef(bad.title.iri), rdflib.Literal('Second title')))
        try:
            ow.sync_reasoner(bad_world, debug=0)
        except ow.OwlReadyInconsistentOntologyError:
            results['negative_' + case] = 'inconsistency detected'
        else:
            raise AssertionError('Нарушение не обнаружено: ' + case)
    results['consistent'] = True
    results['triples'] = len(graph)
    (ROOT / 'verification.json').write_text(json.dumps(results, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    import rdflib.compare
    main()
