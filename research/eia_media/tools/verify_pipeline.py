"""Exercise the actual edit workflow, including preservation on a rejected overwrite."""
from pathlib import Path
import subprocess, tempfile, shutil, json
R=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='eia-pipeline-') as tmp:
    dst=Path(tmp)/'research';shutil.copytree(R/'tools',dst/'tools',ignore=shutil.ignore_patterns('__pycache__'))
    shutil.copytree(R/'data',dst/'data')
    manifest=json.loads((R/'data/generated-manifest.json').read_text())
    for name in manifest:shutil.copy2(R/name,dst/name)
    narrative=dst/'FULL_REPORT.md';narrative.write_text('Author edit that must survive.\n')
    command=['python',str(dst/'tools/compile_research.py')]
    subprocess.run(command+['--check'],check=True,capture_output=True)
    # A legitimate JSON edit should reach the reference export, without touching a narrative.
    source=dst/'data/research.json';d=json.loads(source.read_text());d['claims'][0]['significance']='Updated analytical interpretation.';source.write_text(json.dumps(d,ensure_ascii=False))
    subprocess.run(command+['--write'],check=True,capture_output=True)
    assert 'Updated analytical interpretation.' in (dst/'FINDINGS.md').read_text()
    assert narrative.read_text()=='Author edit that must survive.\n'
    # A manual generated-file edit must be refused and remain recoverable.
    output=dst/'FINDINGS.md';edited=output.read_text()+'\nManual correction.\n';output.write_text(edited)
    result=subprocess.run(command+['--write'],capture_output=True,text=True)
    assert result.returncode!=0 and 'Ручные изменения защищены' in result.stderr
    assert output.read_text()==edited
print('PASS: JSON edit exported; narrative preserved; manual reference edit refused without loss.')
