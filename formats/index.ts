// Note: Templates are defined as strings to ensure compatibility without specific loaders.

export const LATEX_TEMPLATE = `\\documentclass[a4paper,11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[spanish]{babel}
\\usepackage{geometry}
\\usepackage{tabularx}
\\usepackage{multirow}
\\usepackage{enumitem}
\\usepackage{array}
\\usepackage{graphicx}
\\usepackage{fancyhdr}

\\geometry{left=2cm, right=2cm, top=2cm, bottom=2cm}

\\newcolumntype{L}{>{\\raggedright\\arraybackslash}X}
\\renewcommand{\\arraystretch}{1.4}

\\begin{document}

\\begin{center}
    \\textbf{\\Large [NOMBRE_SESION]}\\\\[0.2cm]
    \\textbf{\\textit{\\small SESIÓN DE APRENDIZAJE}}
\\end{center}

\\vspace{0.3cm}

\\noindent \\textbf{I. DATOS INFORMATIVOS:}

\\vspace{0.2cm}

\\noindent
\\begin{tabular}{ll}
    \\textbf{1.1 Área Curricular} & : [AREA] \\\\
    \\textbf{1.2 Ciclo -- Grado}  & : [CICLO_GRADO] \\\\
    \\textbf{1.3 Docente}         & : [DOCENTE] \\\\
\\end{tabular}

\\vspace{0.5cm}

\\noindent \\textbf{II. SECUENCIA DIDÁCTICA}

\\vspace{0.2cm}

\\noindent
\\begin{tabularx}{\\textwidth}{|p{2cm}|p{3cm}|L|p{3cm}|}
    \\hline
    \\multicolumn{2}{|c|}{\\textbf{Momentos}} & \\multicolumn{1}{c|}{\\textbf{Estrategias}} & \\multicolumn{1}{c|}{\\textbf{Materiales}} \\\\
    \\hline

    \\multirow{4}{*}{\\textbf{Inicio}} 
    & \\textbf{Motivación} 
    & [MOTIVACION]
    & \\multirow{4}{*}{\\parbox{\\linewidth}{
        [MATERIALES_INICIO]
    }} \\\\
    \\cline{2-3}

    & \\textbf{Saberes previos} 
    & [SABERES_PREVIOS]
    & \\\\ 
    \\cline{2-3}

    & \\textbf{Conflicto cognitivo} 
    & [CONFLICTO_COGNITIVO]
    & \\\\ 
    \\cline{2-3}

    & \\textbf{Propósito} 
    & [PROPOSITO]
    & \\\\ 
    \\hline

    \\multicolumn{2}{|l|}{\\textbf{Desarrollo}} 
    & [ESTRATEGIAS_DESARROLLO]
    & [MATERIALES_DESARROLLO] \\\\
    \\hline
    \\multicolumn{2}{|l|}{\\textbf{Cierre}} 
    & [ESTRATEGIAS_CIERRE]
    & [MATERIALES_CIERRE] \\\\
    \\hline

    \\multicolumn{2}{|l|}{\\textbf{Tarea}} 
    & [ACTIVIDADES_CASA]
    & [MATERIALES_CASA] \\\\
    \\hline

\\end{tabularx}

\\end{document}`;

export const Templates = {
  minedu: LATEX_TEMPLATE,
  compacto: LATEX_TEMPLATE,
  rural: LATEX_TEMPLATE,
};