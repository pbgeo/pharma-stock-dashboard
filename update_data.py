import json, re, sys
from datetime import date

today = str(date.today())
items = json.loads(open('data_today.json').read())

html = open('index.html', encoding='utf-8').read()

# 기존 HISTORY 추출
m = re.search(r'// __DATA_START__\n\s*var HISTORY = (\[.*?\]);\n\s*// __DATA_END__', html, re.DOTALL)
history = json.loads(m.group(1))

# 오늘 데이터 추가 (중복 제거)
history = [d for d in history if d['date'] != today]
history.append({'date': today, 'items': items})

# HTML 업데이트
new_line = f'    // __DATA_START__\n    var HISTORY = {json.dumps(history, ensure_ascii=False)};\n    // __DATA_END__'
new_html = re.sub(
    r'    // __DATA_START__\n\s*var HISTORY = \[.*?\];\n\s*// __DATA_END__',
    new_line, html, flags=re.DOTALL
)

open('index.html', 'w', encoding='utf-8').write(new_html)
print(f'완료: {today} 데이터 추가 (총 {len(history)}일치)')
