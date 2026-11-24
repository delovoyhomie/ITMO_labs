"""Итоговая численная проверка GPSS, выполненного Notebook и PDF."""
from pathlib import Path
import argparse,hashlib,json
import numpy as np
import pandas as pd
import nbformat
from model import ROOT,closed_exact


def main(visual_reviewed=False,pdf_pages=None):
    r=ROOT/'results/gpss';meta=json.loads((r/'metadata.json').read_text())
    assert meta['native_complete']
    execution=json.loads((ROOT/'gpss-native/execution-manifest.json').read_text())
    assert execution['reports']==meta['native_reports']==meta['expected_native_reports']
    baseline=pd.read_csv(r/'baseline.csv');mg=pd.read_csv(r/'mg1_validation.csv')
    assert baseline.error_percent.max()<1
    assert ((mg.w-mg.exact_w).abs()<=mg.w_ci).all()
    assert ((mg.u-mg.exact_u).abs()<=mg.u_ci).all()
    closed=pd.read_csv(r/'closed.csv');opened=pd.read_csv(r/'open.csv')
    exp=closed[closed.law=='M'];exact_errors=[abs(row.through/closed_exact(int(row.M))['through']-1) for row in exp.itertuples()]
    assert max(exact_errors)<.01
    assert np.allclose(closed.m,closed.M)
    actual=pd.read_csv(r/'actual_load.csv');v=actual[actual.arrival=='M']
    forms=pd.read_csv(r/'form2.csv');points=pd.read_csv(r/'form2_replications.csv')
    assert len(forms)==360 and len(points)==4320
    assert (points.arrived>=points.N).all()
    for _,g in points.groupby(['way','arrival','y','replication']):
        assert list(g.sort_values('N').N)==[10,20,50,100,200,300,600,1000,3000,10000,30000,100000]
    threshold=json.loads((r/'buffer_threshold.json').read_text())
    for t in threshold:
        assert t['checks'][0]['E']==t['E_star_observed']-1
        assert t['checks'][0]['lost']>0 and t['checks'][1]['lost']==0
    book=nbformat.read(ROOT/'Lab3.ipynb',as_version=4)
    code=[c for c in book.cells if c.cell_type=='code']
    errors=[o for c in code for o in c.outputs if o.output_type=='error']
    assert not errors and all(c.execution_count is not None for c in code)
    audit=json.loads((ROOT/'verification.json').read_text()).get('methodical_audit',{})
    audit.update(mandatory_native_gpss_translation_and_execution=True,native_gpss_status='Полная серия выполнена в GPSS World Core; стандартные отчёты сохранены.',
        form2_rows=len(forms),individual_checkpoints=len(points),network_protocols=len(pd.read_csv(r/'network_protocols.csv')),
        passed_counter='completed service + rejection; arrived = passed + live - 1 source transaction',
        variance_wording_corrected=True,waiting_zero_mass_accounted=True,network_critical_population_native_and_analytic=True)
    report=ROOT/'3313_Якименко_Владислав_ЛР3.pdf'
    result=dict(engine=meta['engine'],markov_comparison=dict(max_error_percent=float(baseline.error_percent.max()),
        exact_values_in_pointwise_95_CI=int(((baseline.simulation-baseline.markov).abs()<=baseline.ci).sum()),
        total_characteristics=len(baseline)),mg1_validation=True,closed_population_conserved=True,
        closed_M_max_relative_error=float(max(exact_errors)),
        open_flow_balance_max_relative=float((opened.through/opened.lambda_-1).abs().max()),
        actual_load_max_absolute_error=float((v.rho-v.target_rho_M).abs().max()),
        gpss_native=dict(projects=execution['projects'],standard_reports=execution['reports'],native_execution_verified=True,
            archive=execution['archive'],sha256=execution['archive_sha256']),
        buffer_thresholds=threshold,whole_assignment_complete=bool(visual_reviewed and pdf_pages),
        notebook=dict(cells=len(book.cells),code_cells=len(code),executed=True,errors=len(errors)),
        pdf=dict(pages=pdf_pages,visually_reviewed=visual_reviewed),methodical_audit=audit,
        sha256={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [report,ROOT/'Lab3.ipynb']})
    (ROOT/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in result.items() if k not in ['methodical_audit','sha256','buffer_thresholds']},ensure_ascii=False,indent=2))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--visual-reviewed',action='store_true');p.add_argument('--pdf-pages',type=int)
    a=p.parse_args();main(a.visual_reviewed,a.pdf_pages)
