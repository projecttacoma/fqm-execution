export default `<pre style="tab-size: 2 {{~#if @root.highlightLogic~}}; line-height: 1.51em{{~/if~}}"
  data-library-name="{{ libraryName }}" data-statement-name="{{ statementName }}">
<code>
{{> clause}}
</code>
</pre>`;
