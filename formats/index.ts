// Note: Templates are defined as strings to ensure compatibility without specific loaders.

const LATEX_MINEDU = `\\documentclass[a4paper,11pt]{article}
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
    \\textbf{\\textit{\\small SESIÓN DE APRENDIZAJE - FORMATO MINEDU}}
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

const LATEX_COMPACTO = `\\documentclass[a4paper,10pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[spanish]{babel}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\geometry{left=1.5cm, right=1.5cm, top=1.5cm, bottom=1.5cm}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]

\\begin{document}

\\noindent \\textbf{\\large [NOMBRE_SESION]} \\hfill \\textbf{[AREA]} \\\\
\\small [CICLO_GRADO] | Docente: [DOCENTE]

\\section*{Inicio}
\\textbf{Motivación:} [MOTIVACION] \\\\
\\textbf{Saberes Previos:} [SABERES_PREVIOS] \\\\
\\textbf{Propósito:} [PROPOSITO] \\\\
\\textit{Materiales:} [MATERIALES_INICIO]

\\section*{Desarrollo}
[ESTRATEGIAS_DESARROLLO] \\\\
\\textit{Materiales:} [MATERIALES_DESARROLLO]

\\section*{Cierre}
[ESTRATEGIAS_CIERRE] \\\\
\\textit{Reflexión:} [CONFLICTO_COGNITIVO]

\\section*{Tarea}
[ACTIVIDADES_CASA]

\\end{document}`;

const LATEX_RURAL = `\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[spanish]{babel}
\\usepackage{geometry}

\\geometry{left=2.5cm, right=2.5cm, top=2.5cm, bottom=2.5cm}

\\begin{document}

\\begin{center}
    \\textbf{\\LARGE [NOMBRE_SESION]}
\\end{center}

\\vspace{0.5cm}

\\noindent \\textbf{Área:} [AREA] \\\\
\\textbf{Grado:} [CICLO_GRADO]

\\vspace{0.5cm}

\\noindent \\textbf{1. NUESTRO PROPÓSITO:} \\\\
[PROPOSITO]

\\vspace{0.5cm}

\\noindent \\textbf{2. APRENDEMOS (Inicio):} \\\\
[MOTIVACION] \\\\
[SABERES_PREVIOS]

\\vspace{0.5cm}

\\noindent \\textbf{3. CONSTRUIMOS (Desarrollo):} \\\\
[ESTRATEGIAS_DESARROLLO]

\\vspace{0.5cm}

\\noindent \\textbf{4. COMPROBAMOS (Cierre):} \\\\
[ESTRATEGIAS_CIERRE]

\\vspace{0.5cm}

\\noindent \\textbf{MATERIALES NECESARIOS:} \\\\
[MATERIALES_INICIO]
[MATERIALES_DESARROLLO]

\\end{document}`;

export const Templates = {
  minedu: LATEX_MINEDU,
  compacto: LATEX_COMPACTO,
  rural: LATEX_RURAL
};