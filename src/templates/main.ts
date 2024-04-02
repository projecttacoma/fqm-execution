export default `{{~#if @root.highlightCoverage~}}
<pre style="tab-size: 2; border-bottom-width: 4px"
  data-library-name="{{ libraryName }}" data-statement-name="{{ statementName }}">
<code>
{{> clause}}
</code>
</pre>
{{else}}
<pre style="tab-size: 2; border-bottom-width: 4px; line-height: 1.51em"
  data-library-name="{{ libraryName }}" data-statement-name="{{ statementName }}">
<code>
{{> clause}}
</code>
</pre>
{{~/if~}}`;
