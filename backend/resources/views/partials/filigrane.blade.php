{{--
    Filigrane des documents générés — cahier IBIG SOFT v1.1 §3.5.

    À N'INCLURE QUE dans un document produit en HTML (badge imprimé, page
    destinée à l'impression). Les PDF n'ont PAS besoin de ce partiel : ils sont
    marqués une fois pour toutes par App\Support\PdfFiligrane, apposé sur le
    canevas dompdf. Un filigrane recopié dans chaque vue se retire une vue à la
    fois.

    Variable attendue :
      $orgFiligrane  int|null  espace au nom duquel le document est produit.
                               Omise, c'est l'organisation de l'utilisateur
                               authentifié qui fait foi.

    Le texte n'est jamais écrit ici : il vient de LicenceService::filigrane().
--}}
@php($__filigrane = app(\App\Services\FiligraneService::class)->texte($orgFiligrane ?? null))

@if ($__filigrane)
    <div class="filigrane-ibig" style="margin-top:8px;text-align:center;font-size:8px;color:#6b7280;letter-spacing:.02em;">
        {{ $__filigrane }}
    </div>
@endif
