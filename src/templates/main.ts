export default `<pre style="tab-size: 2; border-bottom-width: 4px; {{~#unless @root.highlightCoverage~}} line-height: 1.51em{{~/unless~}}"
  data-library-name="{{ libraryName }}" data-statement-name="{{ statementName }}">
<code>
{{> clause}}
</code>
</pre>`;
